import type { Story } from '@/lib/stories';

// Editorial travel-story card — photo + category chip + title + excerpt + byline.
export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="story-card">
      <div className="story-photo">
        <span className="story-cat">{story.category}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.image} alt={story.title} loading="lazy" />
      </div>
      <div className="story-body">
        <h3>{story.title}</h3>
        <p>{story.excerpt}</p>
        <div className="story-meta">
          <b>{story.author}</b>
          <span>·</span>
          <span>{story.date}</span>
        </div>
      </div>
    </article>
  );
}
