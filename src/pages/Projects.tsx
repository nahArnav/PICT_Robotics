import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Button, Card, Kicker, Section, inputCls } from "../components/ui";
import { DataState } from "../components/DataState";
import { useRemote } from "../lib/useRemote";
import { supabase } from "../lib/supabase";

export function Projects() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const remote = useRemote(async () => {
    let query = supabase
      .from("projects")
      .select("*", { count: "exact" })
      .eq("published", true)
      .order("display_order")
      .order("year", { ascending: false })
      .order("id")
      .range(page * 12, page * 12 + 11);
    if (category !== "All") query = query.eq("category", category);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  }, [category, search, page]);
  return (
    <>
      <PageHead
        kicker="Projects"
        title="Engineering we ship."
        sub="A live archive of the robots, systems and prototypes built by club members."
      />
      <Section className="py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {["All", "Autonomous", "Embedded", "Vision", "Mechanical", "Software"].map((item) => (
              <Button
                key={item}
                variant={category === item ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  setCategory(item);
                  setPage(0);
                }}
              >
                {item}
              </Button>
            ))}
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 text-ink-soft" size={16} />
            <input
              aria-label="Search projects"
              className={`${inputCls} pl-9`}
              value={search}
              placeholder="Search projects…"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
        <DataState
          loading={remote.loading}
          error={remote.error}
          retry={remote.refresh}
          empty={
            !remote.loading && !remote.error && !remote.data?.rows.length
              ? "No published projects match your search."
              : undefined
          }
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {remote.data?.rows.map((project) => (
            <Link key={project.id} to={`/projects/${project.slug ?? project.id}`} className="group">
              <Card hover className="h-full overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden bg-paper-2">
                  {project.image_url && (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="label absolute left-3 top-3 rounded bg-indigo/80 px-2 py-0.5 text-[10px] text-white">
                    {project.category}
                  </span>
                  <span className="absolute right-3 top-3 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold">
                    {project.year}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-display text-lg font-semibold">{project.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{project.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={tag} className="rounded border border-line px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 12 >= (remote.data?.total ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </Section>
    </>
  );
}
export function ProjectDetail() {
  const { slug } = useParams();
  const remote = useRemote(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", slug ?? "")
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, [slug]);
  if (remote.loading || remote.error || !remote.data)
    return (
      <Section className="py-20">
        <DataState
          loading={remote.loading}
          error={remote.error}
          retry={remote.refresh}
          empty={
            !remote.loading && !remote.error
              ? "This project is unavailable or unpublished."
              : undefined
          }
        />
        <Button to="/projects" className="mt-5" variant="outline">
          All projects
        </Button>
      </Section>
    );
  const project = remote.data;
  return (
    <>
      <section className="relative overflow-hidden bg-indigo text-white">
        {project.image_url && (
          <img
            src={project.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
        <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-24">
          <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-white/70">
            <ArrowLeft size={16} />
            All projects
          </Link>
          <Kicker className="mt-6 block !text-teal">
            {project.category} · {project.year}
          </Kicker>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold md:text-6xl">
            {project.title}
          </h1>
        </div>
      </section>
      <Section className="grid gap-10 py-16 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="font-display text-xl font-bold">Overview</h2>
          <p className="mt-4 whitespace-pre-wrap text-ink-soft">{project.description}</p>
          {project.image_url && (
            <img
              src={project.image_url}
              alt={project.title}
              className="mt-8 w-full rounded-xl border border-line"
            />
          )}
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <Kicker>Technologies</Kicker>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded border border-line px-2 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </Card>
          {project.repository_url && (
            <Button
              href={project.repository_url}
              target="_blank"
              variant="outline"
              className="w-full"
            >
              View repository
            </Button>
          )}
          {project.demo_url && (
            <Button href={project.demo_url} target="_blank" variant="outline" className="w-full">
              View demo
            </Button>
          )}
          <Button to="/recruitment" variant="cta" className="w-full">
            Build the next one
            <ArrowRight size={16} />
          </Button>
        </aside>
      </Section>
    </>
  );
}
export function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <div className="bp-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-20">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-indigo md:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">{sub}</p>
      </div>
    </section>
  );
}
