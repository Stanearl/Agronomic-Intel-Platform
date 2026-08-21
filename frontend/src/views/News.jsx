import { motion } from "framer-motion";
import { Calendar, ArrowUpRight, Newspaper } from "lucide-react";
import Header from "../components/Header";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// No published articles yet. Real entries will populate this list as
// field milestones, platform releases, and research findings go live.
const ARTICLES = [];

/**
 * ArticleCard
 * Premium, clean UI card for a single news/update entry. Shares the
 * white-surface, slate-border, soil-health-green accent language
 * used across the rest of the application. The first (featured)
 * article spans the full width on md+ screens to create a simple,
 * intentional masonry-style rhythm without extra layout libraries.
 */
function ArticleCard({ article }) {
  const Icon = article.icon;
  return (
    <motion.article
      variants={item}
      className={[
        "group flex flex-col justify-between rounded-sm border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg",
        article.featured ? "md:col-span-2" : "",
      ].join(" ")}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            <Icon className="h-3.5 w-3.5" />
            {article.tag}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            {article.date}
          </div>
        </div>

        <h2 className="mt-4 text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
          {article.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{article.excerpt}</p>
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-transform duration-200 group-hover:translate-x-0.5">
        Read more
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.article>
  );
}

/**
 * News
 * Public-facing "News Feed" page. Premium card grid with a light
 * masonry rhythm (the most recent/featured update spans two columns)
 * surfacing project updates such as field-data collection milestones
 * and dashboard releases.
 */
export default function News() {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <Header />

      <main className="flex-1 pt-16">
        <section className="border-b border-slate-200 bg-white px-6 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-5xl text-center"
          >
            
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              News Feed
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
              Field milestones, platform releases, and research findings from the Digital
              Fertilizer Decision Support Tool team.
            </p>
          </motion.div>
        </section>

        <section className="bg-background px-6 py-14 md:py-20">
          {ARTICLES.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2"
            >
              {ARTICLES.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-slate-200 bg-white px-6 py-16 text-center"
            >
              <Newspaper className="h-8 w-8 text-slate-300" />
              <h2 className="text-base font-semibold text-slate-700">No updates yet</h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-500">
                Check back soon for field milestones, platform releases, and research
                findings from the Digital Fertilizer Decision Support Tool team.
              </p>
            </motion.div>
          )}
        </section>

        <footer className="border-t border-border py-6 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Secure • In-Memory Analytics • 13 Verified Soil Metrics
        </footer>
      </main>
    </div>
  );
}
