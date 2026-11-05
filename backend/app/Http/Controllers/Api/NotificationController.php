<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Notification::where('recipient_id', $request->user()->id);

        if ($request->boolean('unread_only')) {
            $query->unread();
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $paginator = $query->latest()->paginate($request->integer('per_page', 20));

        return $this->ok('OK', [
            'items' => $paginator->through(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'link' => $n->link,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ])->items(),
            'unread_count' => Notification::where('recipient_id', $request->user()->id)->unread()->count(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        return $this->ok('OK', [
            'unread_count' => Notification::where('recipient_id', $request->user()->id)->unread()->count(),
        ]);
    }

    public function markRead(Request $request, Notification $notification)
    {
        $this->authorizeOwner($request, $notification);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return $this->ok('Notification marked as read', ['id' => $notification->id]);
    }

    public function markAllRead(Request $request)
    {
        $updated = Notification::where('recipient_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return $this->ok('All notifications marked as read', ['updated' => $updated]);
    }

    public function destroy(Request $request, Notification $notification)
    {
        $this->authorizeOwner($request, $notification);

        $notification->delete();

        return $this->ok('Notification removed');
    }

    private function authorizeOwner(Request $request, Notification $notification): void
    {
        abort_unless($notification->recipient_id === $request->user()->id, 403, 'Not your notification.');
    }
}
