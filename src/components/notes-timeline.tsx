"use client";

import { useRef, useTransition } from "react";
import { Send, Trash2, MessageSquare } from "lucide-react";
import type { Note } from "@/generated/prisma/client";
import { addNote, deleteNote } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/dates";

export function NotesTimeline({
  propertyId,
  notes,
}: {
  propertyId: string;
  notes: Note[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={(formData) => {
          startTransition(async () => {
            await addNote(propertyId, formData);
            formRef.current?.reset();
          });
        }}
        className="space-y-2"
      >
        <Textarea
          name="body"
          placeholder="Add a note — a phone call, a thought, something you noticed…"
          rows={3}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            <Send className="size-4" />
            Add note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          No notes yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="group relative rounded-lg border bg-card p-3">
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <time className="text-xs text-muted-foreground">
                  {formatDateTime(note.timestamp)}
                </time>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteNote(note.id, propertyId);
                    })
                  }
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
