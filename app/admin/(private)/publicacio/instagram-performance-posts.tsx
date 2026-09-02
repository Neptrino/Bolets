import Image from "next/image";

import type { InstagramTopPost } from "@/src/lib/instagram-performance-server";

import { formatDetailDateTime, numberFormatter } from "../detail-utils";
import styles from "./instagram-performance-posts.module.css";

const formatLabels: Record<string, string> = {
  post: "Publicació",
  reel: "Reel",
  story: "Story",
};

export function InstagramPerformancePosts({ posts }: { posts: InstagramTopPost[] }) {
  return (
    <ol className={styles.list}>
      {posts.map((post, index) => (
        <li className={styles.post} key={post.id}>
          <span className={styles.rank} aria-label={`Posició ${index + 1}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.thumbnail}>
            {post.thumbnailPath ? (
              <Image
                alt=""
                height={96}
                sizes="(max-width: 640px) 62px, (max-width: 900px) 72px, 84px"
                src={post.thumbnailPath}
                unoptimized
                width={96}
              />
            ) : (
              <span>{post.format === "reel" ? "Reel" : "Sense imatge"}</span>
            )}
          </div>
          <div className={styles.identity}>
            <div className={styles.meta}>
              <span>{formatLabels[post.format] ?? post.format}</span>
              <time dateTime={post.publishedAt ?? undefined}>{formatDetailDateTime(post.publishedAt)}</time>
            </div>
            <strong>{post.caption || "Text no disponible a Buffer"}</strong>
          </div>
          <dl className={styles.metrics}>
            <div className={styles.primaryMetric}><dt>Abast</dt><dd>{numberFormatter.format(post.reach)}</dd></div>
            <div><dt>Comparticions</dt><dd>{numberFormatter.format(post.shares)}</dd></div>
            <div><dt>Desats</dt><dd>{numberFormatter.format(post.saves)}</dd></div>
          </dl>
        </li>
      ))}
    </ol>
  );
}
