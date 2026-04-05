"use client";

import { Bell, ExternalLink, Plus, Send, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { publishJoltNotification, setJoltSessionId, type JoltRecipient, type JoltRule } from "../utils/joltBus";
import { getSessionId } from "../services/serviceUtils";

type _DraftRule = {
  name: string;
  label: string;
  countThreshold: string;
  withinMinutes: string;
  operator: "AND" | "OR";
  recipients: string; // comma-separated
};

const _newRuleId = (): string => {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const _parseRecipients = (raw: string): JoltRecipient[] => {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [{ type: "role", value: "Manager" }];
  }

  return parts.map((p) => {
    // Very small heuristic for the demo.
    if (p.toLowerCase().startsWith("role:")) {
      return { type: "role", value: p.slice(5).trim() || "Manager" };
    }
    if (p.toLowerCase().startsWith("group:")) {
      return { type: "group", value: p.slice(6).trim() || "Ops" };
    }
    return { type: "user", value: p };
  });
};

const _formatRecipients = (recipients: JoltRecipient[]): string => {
  return recipients
    .map((r) => (r.type === "user" ? r.value : `${r.type}:${r.value}`))
    .join(", ");
};

/**
 * Interactive mock rule builder for demonstrating notification logic.
 *
 * This does not persist rules. The goal is a demo workflow:
 * - Configure simple criteria
 * - Click "Test" to notify the `/jolt` tab via BroadcastChannel
 */
export function JoltRules() {
  const [rules, setRules] = React.useState<JoltRule[]>([
    {
      id: _newRuleId(),
      name: "High person count",
      label: "person",
      countThreshold: 10,
      withinMinutes: 5,
      operator: "AND",
      recipients: [{ type: "role", value: "Manager" }],
    },
  ]);

  const [draft, setDraft] = React.useState<_DraftRule>({
    name: "",
    label: "person",
    countThreshold: "10",
    withinMinutes: "5",
    operator: "AND",
    recipients: "role:Manager",
  });

  const addRule = () => {
    const count = Number.parseInt(draft.countThreshold || "0", 10);
    const mins = Number.parseInt(draft.withinMinutes || "0", 10);

    const next: JoltRule = {
      id: _newRuleId(),
      name: (draft.name || "").trim() || `Rule: ${draft.label}`,
      label: (draft.label || "").trim().toLowerCase() || "unknown",
      countThreshold: Number.isFinite(count) && count > 0 ? count : undefined,
      withinMinutes: Number.isFinite(mins) && mins > 0 ? mins : undefined,
      operator: draft.operator,
      recipients: _parseRecipients(draft.recipients),
    };

    setRules((prev) => [next, ...prev]);
  };

  const testRule = (rule: JoltRule) => {
    // Ensure the receiver tab uses the same session id.
    setJoltSessionId(getSessionId());

    const countPart =
      rule.countThreshold !== undefined ? `label count >= ${rule.countThreshold}` : undefined;
    const timePart =
      rule.withinMinutes !== undefined ? `within ${rule.withinMinutes}m` : undefined;
    const condition = [countPart, timePart].filter(Boolean).join(` ${rule.operator} `);

    publishJoltNotification({
      title: `Rule triggered: ${rule.name}`,
      body: condition ? `Criteria met: ${condition}` : "Criteria met",
      rule: { id: rule.id, name: rule.name },
      recipients: rule.recipients,
      severity: rule.countThreshold && rule.countThreshold >= 20 ? "critical" : "warning",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Jolt Notification Rules</h2>
          <p className="text-sm text-slate-600 mt-1">
            Mock rule builder. Click Test to send a session-scoped notification to the `/jolt` tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setJoltSessionId(getSessionId());
              window.open(
                "/jolt",
                "jolt_demo_app",
                "popup,width=420,height=880,noopener,noreferrer",
              );
            }}
            className="gap-2"
          >
            <ExternalLink className="size-4" />
            Open Jolt App
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create rule</CardTitle>
          <CardDescription>Define when to notify and who should receive it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-2">
              <Label htmlFor="rule_name">Rule name</Label>
              <Input
                id="rule_name"
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="High person count"
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="rule_label">Label</Label>
              <Input
                id="rule_label"
                value={draft.label}
                onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                placeholder="person"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="rule_count">Count threshold</Label>
              <Input
                id="rule_count"
                type="number"
                min="1"
                value={draft.countThreshold}
                onChange={(e) => setDraft((p) => ({ ...p, countThreshold: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="rule_window">Within (minutes)</Label>
              <Input
                id="rule_window"
                type="number"
                min="1"
                value={draft.withinMinutes}
                onChange={(e) => setDraft((p) => ({ ...p, withinMinutes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <Label htmlFor="rule_op">Op</Label>
              <select
                id="rule_op"
                value={draft.operator}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, operator: e.target.value === "OR" ? "OR" : "AND" }))
                }
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>

            <div className="md:col-span-10 space-y-2">
              <Label htmlFor="rule_recipients">Notify</Label>
              <Input
                id="rule_recipients"
                value={draft.recipients}
                onChange={(e) => setDraft((p) => ({ ...p, recipients: e.target.value }))}
                placeholder="role:Manager, group:Ops, alice@example.com"
              />
              <div className="text-xs text-slate-500">
                Format: `role:Manager`, `group:Ops`, or plain user identifiers (comma-separated).
              </div>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button type="button" onClick={addRule} className="w-full gap-2">
                <Plus className="size-4" />
                Add rule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Rules</CardTitle>
              <CardDescription>Click Test to send a notification.</CardDescription>
            </div>
            <Badge variant="outline">{rules.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-slate-200 bg-white p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-slate-900 truncate">{rule.name}</div>
                    <Badge variant="secondary" className="gap-1">
                      <Bell className="size-3" />
                      {rule.label}
                    </Badge>
                    <Badge variant="outline">{rule.operator}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Criteria:</span>{" "}
                    {rule.countThreshold !== undefined ? `count >= ${rule.countThreshold}` : "count (any)"}{" "}
                    {rule.operator}{" "}
                    {rule.withinMinutes !== undefined ? `within ${rule.withinMinutes}m` : "time (any)"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Notify:</span> {_formatRecipients(rule.recipients)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => testRule(rule)}
                  >
                    <Send className="size-4" />
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete rule"
                    onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}

            {rules.length === 0 && (
              <div className="text-sm text-slate-600">No rules yet. Add one above.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

