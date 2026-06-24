"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProperty } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

function ConfirmButton() {
  // Inline pending state via the form's submit.
  return (
    <Button type="submit" variant="destructive" className="bg-destructive text-white hover:bg-destructive/90">
      <Trash2 className="size-4" />
      Delete property
    </Button>
  );
}

export function DeletePropertyButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const action = deleteProperty.bind(null, id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this property?</DialogTitle>
          <DialogDescription>
            This permanently removes <span className="font-medium text-foreground">{label}</span> and all
            its viewings, notes, photos, and checklist items. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <form action={action}>
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
