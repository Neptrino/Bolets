import Link from "next/link";

export default function NotFound() { return <section className="not-found"><p className="eyebrow">404</p><h1>Aquesta fitxa no creix aquí.</h1><p>Potser l’espècie encara no forma part de l’atles inicial.</p><Link href="/bolets" className="button moss-button">Torna als bolets</Link></section>; }
