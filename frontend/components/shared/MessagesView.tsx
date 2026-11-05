"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquarePlus, RefreshCw, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getData, sendData, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ApiEnvelope, Contact, ConversationSummary, ConversationThread } from "@/types";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  student: "Student",
  company: "Company",
  supervisor: "Supervisor",
};

export function MessagesView() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [subject, setSubject] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(() => {
    return getData<{ items: ConversationSummary[] }>("/messages/conversations", {
      per_page: 50,
    })
      .then((feed) => setConversations(feed.items))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load conversations");
      })
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const openThread = async (id: number) => {
    setActiveId(id);
    setLoadingThread(true);
    setThread(null);
    try {
      const data = await getData<ConversationThread>(`/messages/conversations/${id}`);
      setThread(data);
      const unread = conversations.find((c) => c.id === id)?.unread ?? 0;
      if (unread > 0) {
        sendData("put", `/messages/conversations/${id}/read`)
          .then(() =>
            setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
          )
          .catch(() => undefined);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open conversation");
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread]);

  const openDialog = async () => {
    setDialogOpen(true);
    setContactsLoading(true);
    try {
      setContacts(await getData<Contact[]>("/messages/contacts"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load contacts");
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversation = async () => {
    if (!participantId) {
      toast.error("Pick a person to message");
      return;
    }
    setSending(true);
    try {
      const response = await sendData<ApiEnvelope<{ id: number }>>("post", "/messages/conversations", {
        participant_id: Number(participantId),
        subject: subject.trim() || undefined,
      });
      setDialogOpen(false);
      setSubject("");
      setParticipantId("");
      await loadConversations();
      await openThread(response.data.id);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.fieldError("participant_id") ?? error.message
          : "Could not start the conversation"
      );
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!thread || !draft.trim()) return;
    setSending(true);
    try {
      const response = await sendData<ApiEnvelope<ConversationThread["messages"][number]>>(
        "post",
        `/messages/conversations/${thread.id}/messages`,
        { body: draft.trim() }
      );
      setThread({ ...thread, messages: [...thread.messages, response.data] });
      setDraft("");
      loadConversations();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.fieldError("body") ?? error.message
          : "Could not send the message"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Chat with the students, supervisors and companies on your internships.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={loadConversations}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-full bg-primary px-4 hover:bg-primary-hover"
            onClick={openDialog}
          >
            <MessageSquarePlus className="size-4" /> New message
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5">
            {loadingList ? (
              <LoadingSpinner label="Loading conversations..." />
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <p className="text-xs text-muted-foreground/80">
                  Start one with a person from your internships.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openThread(conversation.id)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {conversation.people.map((p) => p.name).join(", ") || "Conversation"}
                        </p>
                        {conversation.unread > 0 && (
                          <Badge className="rounded-full bg-primary text-[10px] text-primary-foreground border-transparent">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                      {conversation.subject && (
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {conversation.subject}
                        </p>
                      )}
                      <p className="truncate text-xs text-muted-foreground/80">
                        {conversation.last_message
                          ? `${conversation.last_message.from === "me" ? "You: " : ""}${conversation.last_message.body}`
                          : "No messages yet"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[28rem] flex-col border-slate-200/70 shadow-sm">
          <CardContent className="flex flex-1 flex-col pt-5">
            {!activeId ? (
              <EmptyState
                title="Select a conversation"
                description="Pick a thread on the left, or start a new message."
              />
            ) : loadingThread ? (
              <LoadingSpinner label="Loading messages..." />
            ) : !thread ? (
              <EmptyState title="Conversation unavailable" description="Try opening it again." />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {thread.people.map((p) => p.name).join(", ") || "Conversation"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {thread.internship ?? thread.subject ?? "Direct message"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {thread.people.map((person) => (
                      <Badge
                        key={person.id}
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                      >
                        {ROLE_LABEL[person.role] ?? person.role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                  {thread.messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No messages yet. Say hello.
                    </p>
                  ) : (
                    thread.messages.map((message) => {
                      const mine = message.from === "me";
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[70%] ${
                              mine
                                ? "bg-primary text-primary-foreground"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {!mine && (
                              <p className="mb-0.5 text-xs font-semibold text-slate-500">
                                {message.from}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                mine ? "text-primary-foreground/70" : "text-muted-foreground/70"
                              }`}
                            >
                              {formatDateTime(message.sent_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="flex items-end gap-2 border-t border-slate-100 pt-3">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Write a message..."
                    className="flex-1 resize-none rounded-xl bg-white"
                  />
                  <Button
                    className="gap-1.5 rounded-full bg-primary px-4 hover:bg-primary-hover"
                    disabled={sending || !draft.trim()}
                    onClick={sendMessage}
                  >
                    <Send className="size-4" /> Send
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a conversation</DialogTitle>
            <DialogDescription>
              You can only message people connected to your internships.
            </DialogDescription>
          </DialogHeader>
          {contactsLoading ? (
            <LoadingSpinner label="Loading contacts..." />
          ) : contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No one is available to message yet. Once an internship is assigned, your contacts
              appear here.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Recipient</Label>
                <select
                  id="contact"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Select a person</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} — {ROLE_LABEL[contact.role] ?? contact.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary hover:bg-primary-hover"
              onClick={startConversation}
              disabled={sending || !participantId || contacts.length === 0}
            >
              {sending ? "Opening..." : "Open conversation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
