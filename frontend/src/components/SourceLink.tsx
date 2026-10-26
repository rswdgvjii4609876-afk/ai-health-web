import { ExternalLink, ShieldCheck } from "lucide-react";

export default function SourceLink({
  name,
  date,
  url,
}: {
  name: string;
  date: string;
  url: string;
}) {
  return (
    <a
      className="source-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ShieldCheck size={17} aria-hidden="true" />
      <span>
        {name} · {date}
      </span>
      <ExternalLink size={15} aria-hidden="true" />
    </a>
  );
}
