"use client";

import * as React from "react";
import { Bell, CheckCircle2, Trash2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { subscribeToJoltBus, type JoltNotification } from "../utils/joltBus";

const _JoltMark = () => {
  // Simple SVG approximation of the Jolt mark (blue + green slanted shapes).
  return (
    <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M28 6 L8 32 L28 58 L36 50 L24 32 L36 14 Z"
          fill="#1d4ed8"
        />
        <path
          d="M36 14 L28 22 L40 32 L28 42 L36 50 L56 32 Z"
          fill="#16a34a"
        />
      </svg>
    </div>
  );
};

const _formatTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const _severityBadge = (severity: JoltNotification["severity"]) => {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "warning") return <Badge variant="default">Warning</Badge>;
  return <Badge variant="outline">Info</Badge>;
};

/**
 * `/jolt` receiver mock.
 *
 * Listens for session-scoped notifications from the rules page via BroadcastChannel.
 */
export function JoltAppMock() {
  const [notifications, setNotifications] = React.useState<JoltNotification[]>([]);
  const [lastPingAt, setLastPingAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    return subscribeToJoltBus({
      onNotification: (n) => {
        setNotifications((prev) => [n, ...prev].slice(0, 50));
      },
      onPing: () => {
        setLastPingAt(new Date().toISOString());
      },
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden border bg-gradient-to-r from-blue-600 via-emerald-600 to-slate-400">
        <div className="px-6 py-6 flex items-center gap-4">
          <_JoltMark />
          <div className="text-white">
            <div className="text-2xl font-semibold">Jolt</div>
            <div className="text-sm text-white/90">Safety & Operations</div>
            <div className="text-xs text-white/80 mt-1">
              Listening for notifications on this session
              {lastPingAt ? ` (last ping ${_formatTime(lastPingAt)})` : ""}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Mock inbox for demoing delivery.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{notifications.length}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setNotifications([])}
                disabled={notifications.length === 0}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-slate-600">
              <Bell className="size-10 mx-auto text-slate-300 mb-3" />
              No notifications yet.
              <div className="text-sm text-slate-500 mt-1">
                Open the rules page and click Test to send one.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-slate-900 truncate">
                          {n.title}
                        </div>
                        {_severityBadge(n.severity)}
                        {n.rule?.name && (
                          <Badge variant="secondary">{n.rule.name}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                        {n.body}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {_formatTime(n.createdAtIso)}
                      </div>
                    </div>
                    <div className="shrink-0 text-green-600">
                      <CheckCircle2 className="size-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

