import Link from "next/link";

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-4 text-neutral-100">
        <div className="mx-auto max-w-6xl">
          <Link
            className="inline-block rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-300"
            href="/"
          >
            {"\u30e1\u30a4\u30f3\u30da\u30fc\u30b8 / Main page"}
          </Link>
        </div>
      </div>

      {children}
    </>
  );
}