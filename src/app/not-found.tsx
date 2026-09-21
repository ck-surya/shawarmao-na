import Link from 'next/link';
export default function NotFound(){return <div className="page narrow"><span className="eyebrow">404</span><h1>This page isn’t on the menu.</h1><Link className="button" href="/menu">Back to the menu</Link></div>;}
