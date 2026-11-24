import React, { Suspense } from "react";
import { ApplicationDetailView } from "./detail-view";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

async function ApplicationDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationDetailView id={id} />;
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-secondary">
          Loading application details...
        </div>
      }
    >
      <ApplicationDetailContent params={params} />
    </Suspense>
  );
}
