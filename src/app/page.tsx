"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "@/trpc/client";

export default function HITLDashboard() {
  const utils = trpc.useUtils();
  const { data: threads, isLoading, refetch } = trpc.inbox.getThreads.useQuery();

  const approveMutation = trpc.action.approveAction.useMutation({
    onSuccess: () => {
      utils.inbox.getThreads.invalidate();
    },
  });

  const editMutation = trpc.action.editAction.useMutation({
    onSuccess: () => {
      utils.inbox.getThreads.invalidate();
      setIsEditing(false);
    },
  });

  const rejectMutation = trpc.action.rejectAction.useMutation({
    onSuccess: () => {
      utils.inbox.getThreads.invalidate();
    },
  });

  const runAgentMutation = trpc.action.runAgentOnThread.useMutation({
    onSuccess: () => {
      utils.inbox.getThreads.invalidate();
    },
  });

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "HIGH_RISK" | "RESOLVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    return threads.filter((t) => {
      const matchesSearch =
        t.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const latestDecision = t.agentDecisions[0];
      if (filter === "PENDING") {
        return t.status === "PENDING_HUMAN_REVIEW" || (!latestDecision && t.status === "OPEN");
      }
      if (filter === "HIGH_RISK") {
        return latestDecision?.riskLevel === "HIGH";
      }
      if (filter === "RESOLVED") {
        return t.status === "RESOLVED";
      }
      return true;
    });
  }, [threads, filter, searchQuery]);

  // Set initial selected thread once loaded
  React.useEffect(() => {
    if (!selectedThreadId && filteredThreads.length > 0) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredThreads, selectedThreadId]);

  const selectedThread = threads?.find((t) => t.id === selectedThreadId);
  const decision = selectedThread?.agentDecisions[0];

  React.useEffect(() => {
    if (decision) {
      setEditedResponse(decision.draftResponse);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision?.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-300">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-neutral-400">Loading RelayAI Workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased overflow-hidden">
      {/* Sidebar: Navigation & Brand */}
      <aside className="w-80 border-r border-neutral-800/80 bg-neutral-900/90 flex flex-col backdrop-blur-xl">
        {/* Brand Header */}
        <div className="p-5 border-b border-neutral-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base tracking-tight text-white">RelayAI</h1>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    HITL
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Supervisor Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              title="Refresh inbox"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search customer, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950/70 border border-neutral-800 rounded-lg px-3 py-2 pl-9 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 transition"
            />
            <svg
              className="w-4 h-4 text-neutral-500 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 text-[11px]">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "PENDING", label: "Needs Review" },
                { id: "HIGH_RISK", label: "High Risk" },
                { id: "RESOLVED", label: "Resolved" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                  filter === tab.id
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No threads found matching filter
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const latestDecision = thread.agentDecisions[0];
              const isSelected = selectedThreadId === thread.id;
              const isHighRisk = latestDecision?.riskLevel === "HIGH";
              const isPending = thread.status === "PENDING_HUMAN_REVIEW";

              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500/40 shadow-md shadow-indigo-950/20"
                      : "bg-neutral-900/50 border-neutral-800/60 hover:bg-neutral-850 hover:border-neutral-700/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-neutral-100 truncate pr-2">
                      {thread.customer.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isPending
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                          : thread.status === "RESOLVED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                      }`}
                    >
                      {thread.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-neutral-300 truncate mb-1">
                    {thread.subject}
                  </p>

                  <p className="text-[11px] text-neutral-400 line-clamp-1 leading-relaxed">
                    {thread.messages[0]?.body || "No messages"}
                  </p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/50">
                    {isHighRisk ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        HIGH RISK
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        LOW RISK
                      </span>
                    )}

                    {latestDecision && (
                      <span className="text-[10px] text-neutral-400 truncate">
                        {latestDecision.proposedAction.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Review Pane */}
      <main className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
        {selectedThread ? (
          <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-6">
            {/* Header / Customer Context Banner */}
            <div className="bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-6 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedThread.subject}</h2>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      selectedThread.status === "PENDING_HUMAN_REVIEW"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : selectedThread.status === "RESOLVED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                    }`}
                  >
                    {selectedThread.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
                  <span>Customer: <strong className="text-neutral-200">{selectedThread.customer.name}</strong></span>
                  <span>Email: <strong className="text-neutral-200">{selectedThread.customer.email}</strong></span>
                  <span>Thread ID: <code className="text-neutral-400">{selectedThread.id}</code></span>
                </div>
              </div>

              {/* Order Info Badge if linked */}
              {selectedThread.order && (
                <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl flex items-center gap-4 text-xs">
                  <div>
                    <p className="text-neutral-400 font-medium">Order #{selectedThread.order.id}</p>
                    <p className="text-neutral-100 font-bold text-sm mt-0.5">{selectedThread.order.itemName}</p>
                  </div>
                  <div className="border-l border-neutral-800 pl-4">
                    <p className="text-neutral-400">Total</p>
                    <p className="text-emerald-400 font-semibold text-sm">${selectedThread.order.amount.toFixed(2)}</p>
                  </div>
                  <div className="border-l border-neutral-800 pl-4">
                    <p className="text-neutral-400">Status</p>
                    <span className="font-semibold text-indigo-300">{selectedThread.order.status}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Split Section: Conversation History (Left) and AI Agent Audit (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 cols: Thread Message History */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Conversation History ({selectedThread.messages.length})
                </h3>

                <div className="space-y-3">
                  {selectedThread.messages.map((msg) => {
                    const isCustomer = msg.sender === "CUSTOMER";
                    const isHuman = msg.sender === "HUMAN";

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCustomer
                            ? "bg-neutral-900 border-neutral-800 text-neutral-200"
                            : isHuman
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                            : "bg-indigo-950/20 border-indigo-500/30 text-indigo-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isCustomer
                                ? "text-neutral-400"
                                : isHuman
                                ? "text-emerald-400"
                                : "text-indigo-400"
                            }`}
                          >
                            {isCustomer
                              ? selectedThread.customer.name
                              : isHuman
                              ? "Supervisor (Human)"
                              : "RelayAI Agent"}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 6 cols: AI Decision & HITL Review Card */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Agent Decision Audit
                </h3>

                {decision ? (
                  <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
                    {/* Top status badges row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Proposed:</span>
                        <span className="font-bold text-sm text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                          {decision.proposedAction.replace(/_/g, " ")}
                        </span>
                      </div>

                      {decision.riskLevel === "HIGH" ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          HIGH RISK ESCALATION
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          LOW RISK
                        </span>
                      )}
                    </div>

                    {/* Metadata Grid (Intent, Confidence, Sentiment, Urgency) */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 block mb-1">Classified Intent</span>
                        <span className="font-semibold text-neutral-200 capitalize">
                          {decision.intent.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 block mb-1">Model Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.round((decision.confidence || 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-neutral-100">
                            {Math.round((decision.confidence || 0) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 block mb-1">Customer Sentiment</span>
                        <span className="font-semibold text-neutral-200 capitalize">{decision.sentiment || "Neutral"}</span>
                      </div>

                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                        <span className="text-neutral-400 block mb-1">Urgency Level</span>
                        <span className="font-semibold text-neutral-200 capitalize">{decision.urgency || "Medium"}</span>
                      </div>
                    </div>

                    {/* Reasoning Trail */}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                        Policy Reasoning Trail
                      </span>
                      <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 leading-relaxed">
                        {decision.reasoning || "No reasoning documented."}
                      </div>
                    </div>

                    {/* Retrieved Policy Documents Cited */}
                    {decision.retrievedPolicyDocs && decision.retrievedPolicyDocs.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                          Cited Policies (pgvector similarity)
                        </span>
                        <div className="space-y-1.5">
                          {decision.retrievedPolicyDocs.map((doc) => {
                            const isExpanded = expandedPolicyId === doc.id;
                            return (
                              <div
                                key={doc.id}
                                className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-2.5 text-xs transition"
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedPolicyId(isExpanded ? null : doc.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                      {doc.category}
                                    </span>
                                    <span className="font-semibold text-neutral-200">{doc.title}</span>
                                  </div>
                                  <span className="text-neutral-500 text-[11px] hover:text-neutral-300">
                                    {isExpanded ? "Hide" : "View"}
                                  </span>
                                </div>
                                {isExpanded && (
                                  <p className="mt-2 pt-2 border-t border-neutral-800/60 text-neutral-400 text-[11px] leading-relaxed">
                                    {doc.content}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Draft Response Preview & Edit Area */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          {isEditing ? "Edit Outbound Response" : "Draft Response Preview"}
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedResponse}
                            onChange={(e) => setEditedResponse(e.target.value)}
                            rows={4}
                            className="w-full bg-neutral-950 border border-indigo-500/50 rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:border-indigo-400 transition leading-relaxed"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditedResponse(decision.draftResponse);
                              }}
                              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                editMutation.mutate({
                                  decisionId: decision.id,
                                  customResponse: editedResponse,
                                });
                              }}
                              disabled={editMutation.isPending}
                              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md shadow-indigo-600/30"
                            >
                              {editMutation.isPending ? "Sending..." : "Save & Send Custom"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 leading-relaxed italic">
                          &ldquo;{decision.draftResponse}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Human Decision Action Buttons */}
                    {selectedThread.status === "PENDING_HUMAN_REVIEW" ? (
                      <div className="flex gap-3 pt-3 border-t border-neutral-800">
                        <button
                          onClick={() => approveMutation.mutate({ decisionId: decision.id })}
                          disabled={approveMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950/40 text-xs flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                          </svg>
                          {approveMutation.isPending ? "Executing..." : "Approve & Execute"}
                        </button>

                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl transition text-xs border border-neutral-700"
                        >
                          Tweak Response
                        </button>

                        <button
                          onClick={() => rejectMutation.mutate({ decisionId: decision.id })}
                          disabled={rejectMutation.isPending}
                          className="px-4 py-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold rounded-xl transition text-xs border border-rose-800/40"
                        >
                          {rejectMutation.isPending ? "Rejecting..." : "Reject & Escalate"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Supervisor Status:</span>
                        <span className="font-bold text-emerald-400">
                          {decision.humanAction === "APPROVED"
                            ? "✓ Approved by Supervisor"
                            : decision.humanAction === "EDITED"
                            ? "✎ Edited & Sent by Supervisor"
                            : decision.humanAction === "REJECTED"
                            ? "✗ Rejected by Supervisor"
                            : "Auto-executed by Policy Rule"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center space-y-4">
                    <p className="text-sm text-neutral-400">
                      No agent decision has been generated for this thread yet.
                    </p>
                    <button
                      onClick={() => runAgentMutation.mutate({ threadId: selectedThread.id })}
                      disabled={runAgentMutation.isPending}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30"
                    >
                      {runAgentMutation.isPending ? "Running Agent Pipeline..." : "Run AI Agent Pipeline"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-base font-medium">Select a customer thread from the inbox to review</p>
          </div>
        )}
      </main>
    </div>
  );
}
