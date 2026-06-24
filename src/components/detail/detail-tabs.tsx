"use client";

import { LayoutGrid, ClipboardList } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function DetailTabs({
  overview,
  criteria,
}: {
  overview: React.ReactNode;
  criteria: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList variant="line">
        <TabsTrigger value="overview">
          <LayoutGrid />
          Overview
        </TabsTrigger>
        <TabsTrigger value="criteria">
          <ClipboardList />
          Criteria
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" keepMounted className="pt-2">
        {overview}
      </TabsContent>
      <TabsContent value="criteria" keepMounted className="pt-2">
        {criteria}
      </TabsContent>
    </Tabs>
  );
}
