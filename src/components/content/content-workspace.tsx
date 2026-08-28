"use client";

import type { ContentStatus, Platform, PostType } from "@prisma/client";
import {
  CalendarDays,
  Copy,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  PenTool,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  CONTENT_STATUS_CLASS,
  CONTENT_STATUS_LABEL,
  PLATFORM_LABEL,
  POST_TYPE_LABEL,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export type Post = {
  id: string;
  title: string | null;
  content: string;
  contentAr: string | null;
  hashtags: string[];
  platform: Platform;
  postType: PostType;
  status: ContentStatus;
  scheduledAt: Date | string | null;
  publishedAt: Date | string | null;
  imagePrompt: string | null;
  aiGenerated: boolean;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  createdAt: Date | string;
};

type Idea = { topic: string; postType: string; platform: string; hook: string };

export function ContentWorkspace({
  posts,
  canEdit,
  openNew,
}: {
  posts: Post[];
  canEdit: boolean;
  openNew: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<"grid" | "calendar">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [showGenerate, setShowGenerate] = useState(openNew);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [seedTopic, setSeedTopic] = useState("");

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (statusFilter === "ALL" || p.status === statusFilter) &&
          (platformFilter === "ALL" || p.platform === platformFilter),
      ),
    [posts, statusFilter, platformFilter],
  );

  async function fetchIdeas() {
    setLoadingIdeas(true);
    const res = await fetch("/api/content/ideas", { method: "POST" });
    const json = await res.json();
    setLoadingIdeas(false);
    if (!res.ok) {
      toast.push(json.error ?? "Génération impossible", "error");
      return;
    }
    setIdeas(json.ideas);
  }

  async function patchPost(id: string, data: Record<string, unknown>, message: string) {
    const res = await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.push((await res.json()).error ?? "Échec", "error");
      return;
    }
    toast.push(message);
    router.refresh();
  }

  async function deletePost(id: string) {
    if (!confirm("Supprimer ce post ?")) return;
    const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push("Suppression impossible", "error");
      return;
    }
    toast.push("Post supprimé");
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-card p-0.5">
          {(
            [
              ["grid", LayoutGrid, "Bibliothèque"],
              ["calendar", CalendarDays, "Calendrier"],
            ] as const
          ).map(([k, Icon, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                view === k ? "bg-brand-soft text-brand" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="ALL">Tous les statuts</option>
          {Object.entries(CONTENT_STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="w-auto">
          <option value="ALL">Toutes les plateformes</option>
          {Object.entries(PLATFORM_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>

        {canEdit && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchIdeas} loading={loadingIdeas}>
              <Lightbulb className="h-3.5 w-3.5 text-sand" />
              Idées de la semaine
            </Button>
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Wand2 className="h-4 w-4" />
              Générer un post
            </Button>
          </div>
        )}
      </div>

      {ideas && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Idées suggérées</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIdeas(null)}>
              Masquer
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ideas.map((idea, i) => (
              <button
                key={i}
                onClick={() => {
                  setSeedTopic(idea.topic);
                  setShowGenerate(true);
                }}
                className="rounded-lg border border-line p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
              >
                <p className="text-xs font-medium text-ink">{idea.topic}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">{idea.hook}</p>
                <div className="mt-2 flex gap-1.5">
                  <Badge className="bg-card-2 text-muted">
                    {POST_TYPE_LABEL[idea.postType as PostType] ?? idea.postType}
                  </Badge>
                  <Badge className="bg-card-2 text-muted">
                    {PLATFORM_LABEL[idea.platform as Platform] ?? idea.platform}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={PenTool}
            title="Aucun contenu"
            description="Générez votre premier post en français et en darija."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setShowGenerate(true)}>
                  <Wand2 className="h-4 w-4" />
                  Générer un post
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : view === "calendar" ? (
        <CalendarView posts={filtered} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canEdit={canEdit}
              onPatch={patchPost}
              onDelete={deletePost}
            />
          ))}
        </div>
      )}

      <GenerateModal
        open={showGenerate}
        seedTopic={seedTopic}
        onClose={() => {
          setShowGenerate(false);
          setSeedTopic("");
        }}
      />
    </>
  );
}

function PostCard({
  post,
  canEdit,
  onPatch,
  onDelete,
}: {
  post: Post;
  canEdit: boolean;
  onPatch: (id: string, data: Record<string, unknown>, message: string) => void;
  onDelete: (id: string) => void;
}) {
  const toast = useToast();
  const [lang, setLang] = useState<"fr" | "ar">("fr");
  const body = lang === "ar" && post.contentAr ? post.contentAr : post.content;
  const rtl = lang === "ar" && Boolean(post.contentAr);

  const fullText = `${body}\n\n${post.hashtags.join(" ")}`;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="line-clamp-1">{post.title ?? "Sans titre"}</CardTitle>
          <p className="mt-0.5 text-[11px] text-muted">
            {PLATFORM_LABEL[post.platform]} · {POST_TYPE_LABEL[post.postType]}
            {post.aiGenerated && <span className="text-brand"> · IA</span>}
          </p>
        </div>
        <Badge className={CONTENT_STATUS_CLASS[post.status]}>{CONTENT_STATUS_LABEL[post.status]}</Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {post.contentAr && (
          <div className="mb-2 flex w-fit rounded-md border border-line p-0.5">
            {(["fr", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium uppercase transition-colors",
                  lang === l ? "bg-brand-soft text-brand" : "text-muted",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <p
          dir={rtl ? "rtl" : "ltr"}
          className={cn(
            "line-clamp-[10] flex-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted",
            rtl && "font-arabic text-right",
          )}
        >
          {body}
        </p>

        {post.hashtags.length > 0 && (
          <p className="mt-2 line-clamp-2 text-[10px] text-brand">{post.hashtags.join(" ")}</p>
        )}

        {post.imagePrompt && (
          <details className="mt-2 rounded-lg bg-card-2 px-2.5 py-2">
            <summary className="cursor-pointer text-[10px] font-medium text-muted">
              <ImageIcon className="mr-1 inline h-3 w-3" />
              Prompt image (Midjourney / Higgsfield)
            </summary>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{post.imagePrompt}</p>
          </details>
        )}

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
          <span>
            {post.status === "SCHEDULED" && post.scheduledAt
              ? `Planifié ${formatDate(post.scheduledAt)}`
              : post.status === "PUBLISHED" && post.publishedAt
                ? `Publié ${formatDate(post.publishedAt)}`
                : formatDate(post.createdAt)}
          </span>
          {post.status === "PUBLISHED" && (
            <span>
              ❤ {post.likes ?? 0} · 💬 {post.comments ?? 0} · ↗ {post.shares ?? 0}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(fullText);
              toast.push("Post copié");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copier
          </Button>

          {canEdit && (
            <>
              <Select
                className="h-8 w-auto flex-1 text-[11px]"
                value={post.status}
                onChange={(e) => {
                  const status = e.target.value;
                  onPatch(
                    post.id,
                    {
                      status,
                      ...(status === "SCHEDULED" && !post.scheduledAt
                        ? { scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }
                        : {}),
                    },
                    `Statut → ${CONTENT_STATUS_LABEL[status as ContentStatus]}`,
                  );
                }}
              >
                {Object.entries(CONTENT_STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
              <Button variant="ghost" size="icon" onClick={() => onDelete(post.id)} aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            </>
          )}
        </div>

        {canEdit && post.status === "SCHEDULED" && (
          <Input
            type="date"
            className="mt-2 h-8 text-[11px]"
            defaultValue={post.scheduledAt ? String(post.scheduledAt).slice(0, 10) : ""}
            onChange={(e) =>
              e.target.value &&
              onPatch(post.id, { scheduledAt: new Date(e.target.value).toISOString() }, "Date mise à jour")
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function CalendarView({ posts }: { posts: Post[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return {
      date: d,
      key,
      posts: posts.filter((p) => {
        const when = p.scheduledAt ?? p.publishedAt;
        return when && String(new Date(when).toISOString()).slice(0, 10) === key;
      }),
    };
  });

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="grid grid-cols-7 gap-1.5 text-[10px] font-medium uppercase text-muted">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="pb-1 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, key, posts: dayPosts }) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 rounded-lg border p-1.5",
                  isToday ? "border-brand bg-brand-soft/40" : "border-line",
                )}
              >
                <span className={cn("text-[10px]", isToday ? "font-semibold text-brand" : "text-muted")}>
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayPosts.map((p) => (
                    <div
                      key={p.id}
                      title={p.title ?? p.content.slice(0, 80)}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px]",
                        CONTENT_STATUS_CLASS[p.status],
                      )}
                    >
                      {p.title ?? PLATFORM_LABEL[p.platform]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateModal({
  open,
  seedTopic,
  onClose,
}: {
  open: boolean;
  seedTopic: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    content: string;
    contentAr: string | null;
    hashtags: string[];
    imagePrompt: string;
  } | null>(null);
  const [form, setForm] = useState({
    postType: "EDUCATIONAL",
    platform: "INSTAGRAM",
    topic: seedTopic,
    language: "BOTH",
  });

  // Adopt a topic clicked in the ideas panel.
  const [lastSeed, setLastSeed] = useState(seedTopic);
  if (seedTopic !== lastSeed) {
    setLastSeed(seedTopic);
    setForm((f) => ({ ...f, topic: seedTopic }));
  }

  async function generate(save: boolean) {
    setLoading(true);
    const res = await fetch("/api/content/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, save }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.push(json.error ?? "Génération impossible", "error");
      return;
    }
    setPreview(json.generated);
    if (save) {
      toast.push("Post enregistré en brouillon");
      router.refresh();
      onClose();
      setPreview(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Générer un post"
      description="Le contenu est produit par Claude, adapté au marché marocain."
      className="max-w-2xl"
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="gen-type">Type</Label>
            <Select
              id="gen-type"
              value={form.postType}
              onChange={(e) => setForm({ ...form, postType: e.target.value })}
            >
              {Object.entries(POST_TYPE_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="gen-platform">Plateforme</Label>
            <Select
              id="gen-platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {Object.entries(PLATFORM_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="gen-lang">Langue</Label>
            <Select
              id="gen-lang"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="FR">Français</option>
              <option value="AR">العربية (darija)</option>
              <option value="BOTH">Les deux</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="gen-topic">Sujet</Label>
          <Textarea
            id="gen-topic"
            rows={2}
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Ex : pourquoi louer sa piscine en août à Marrakech"
          />
        </div>

        {preview && (
          <div className="space-y-2 rounded-lg border border-line bg-card-2 p-3">
            <p className="text-xs font-semibold text-ink">{preview.title}</p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{preview.content}</p>
            {preview.contentAr && (
              <p
                dir="rtl"
                className="font-arabic whitespace-pre-wrap border-t border-line pt-2 text-right text-[11px] leading-relaxed text-muted"
              >
                {preview.contentAr}
              </p>
            )}
            <p className="text-[10px] text-brand">{preview.hashtags.join(" ")}</p>
            {preview.imagePrompt && (
              <p className="border-t border-line pt-2 text-[10px] text-muted">
                <ImageIcon className="mr-1 inline h-3 w-3" />
                {preview.imagePrompt}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="outline" onClick={() => generate(false)} loading={loading} disabled={!form.topic.trim()}>
            <Sparkles className="h-4 w-4" />
            Aperçu
          </Button>
          <Button onClick={() => generate(true)} loading={loading} disabled={!form.topic.trim()}>
            Générer & enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
