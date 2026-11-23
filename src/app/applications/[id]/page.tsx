import React, { Suspense } from "react";
import { mockApplications } from "@/lib/mock-data";
import { ApplicationDetailView } from "./detail-view";

export function generateStaticParams() {
  return mockApplications.map((app) => ({
    id: app.id,
  }));
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-secondary">
          Loading application details...
        </div>
      }
    >
      <ApplicationDetailView id={id} />
    </Suspense>
  );
}
