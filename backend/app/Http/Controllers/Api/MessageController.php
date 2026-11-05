<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\Access;
use App\Support\ApiResponse;
use App\Support\Notify;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    use ApiResponse;

    public function contacts(Request $request)
    {
        $ids = Access::contactIds($request->user());

        $contacts = User::whereIn('id', $ids)
            ->where('is_suspended', false)
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return $this->ok('OK', $contacts);
    }

    public function index(Request $request)
    {
        $conversations = Conversation::with(['participants', 'lastMessage.sender', 'assignment.internship'])
            ->whereHas('participants', fn ($q) => $q->where('users.id', $request->user()->id))
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 20));

        $me = $request->user()->id;
        $viewer = $request->user();

        return $this->ok('OK', [
            'items' => collect($conversations->items())->map(function (Conversation $c) use ($me, $viewer) {
                $others = $c->participants->filter(fn (User $p) => $p->id !== $me)->values();

                return [
                    'id' => $c->id,
                    'subject' => $c->subject,
                    'people' => $others->map(fn (User $p) => ['id' => $p->id, 'name' => $p->name, 'role' => $p->role])->all(),
                    'internship' => $c->assignment?->internship?->title,
                    'last_message' => $c->lastMessage ? [
                        'body' => $c->lastMessage->body,
                        'from' => $c->lastMessage->sender_id === $me ? 'me' : $c->lastMessage->sender?->name,
                        'sent_at' => $c->lastMessage->created_at?->toIso8601String(),
                    ] : null,
                    'unread' => $c->unreadFor($viewer),
                ];
            })->all(),
            'pagination' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function open(Request $request)
    {
        $validated = $request->validate([
            'participant_id' => 'required|integer|exists:users,id',
            'subject' => 'nullable|string|max:255',
        ]);

        $target = User::findOrFail($validated['participant_id']);

        if (! Access::canContact($request->user(), $target)) {
            return $this->fail('You can only message people connected to your internships.', 403);
        }

        $conversation = $this->directConversation([$request->user()->id, $target->id], $validated['subject'] ?? null);

        return $this->ok('OK', $this->payload($conversation, $request->user()));
    }

    public function show(Request $request, Conversation $conversation)
    {
        $this->authorizeMember($request, $conversation);

        return $this->ok('OK', $this->payload($conversation->load(
            ['participants', 'messages.sender', 'assignment.internship']
        ), $request->user(), true));
    }

    public function store(Request $request, Conversation $conversation)
    {
        $this->authorizeMember($request, $conversation);

        $validated = $request->validate(['body' => 'required|string|max:5000']);

        $message = $conversation->messages()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $conversation->touch();

        foreach ($conversation->participants()->where('users.id', '!=', $request->user()->id)->get() as $peer) {
            Notify::to($peer, 'message', 'New message from '.$request->user()->name,
                str($validated['body'])->limit(80)->value(), '/messages', $conversation);
        }

        Notify::log('message.sent', $request->user()->role.' sent a message in a conversation', $conversation);

        return $this->ok('Message sent', [
            'id' => $message->id,
            'body' => $message->body,
            'from' => $request->user()->name,
            'sent_at' => $message->created_at?->toIso8601String(),
        ], 201);
    }

    public function markRead(Request $request, Conversation $conversation)
    {
        $this->authorizeMember($request, $conversation);

        $conversation->participants()->updateExistingPivot($request->user()->id, ['last_read_at' => now()]);

        return $this->ok('Conversation marked as read');
    }

    private function directConversation(array $userIds, ?string $subject): Conversation
    {
        sort($userIds);

        $existing = Conversation::whereNull('assignment_id')
            ->whereHas('participants', fn ($q) => $q->where('users.id', $userIds[0]))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $userIds[1]))
            ->with('participants')
            ->get()
            ->first(fn (Conversation $c) => $c->participants->count() === 2);

        if ($existing) {
            return $existing;
        }

        $conversation = Conversation::create(['subject' => $subject]);
        $conversation->participants()->attach($userIds);

        return $conversation->load('participants');
    }

    private function payload(Conversation $conversation, User $me, bool $withMessages = false): array
    {
        $data = [
            'id' => $conversation->id,
            'subject' => $conversation->subject,
            'internship' => $conversation->assignment?->internship?->title,
            'people' => $conversation->participants
                ->filter(fn (User $p) => $p->id !== $me->id)
                ->map(fn (User $p) => ['id' => $p->id, 'name' => $p->name, 'role' => $p->role, 'email' => $p->email])
                ->values()
                ->all(),
        ];

        if ($withMessages) {
            $data['messages'] = $conversation->messages()->with('sender')->orderBy('created_at')->get()
                ->map(fn (Message $m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'from' => $m->sender_id === $me->id ? 'me' : $m->sender?->name,
                    'sender_id' => $m->sender_id,
                    'sent_at' => $m->created_at?->toIso8601String(),
                ])->all();
        }

        return $data;
    }

    private function authorizeMember(Request $request, Conversation $conversation): void
    {
        abort_unless($conversation->participants()->where('users.id', $request->user()->id)->exists(),
            403, 'Not your conversation.');
    }
}
