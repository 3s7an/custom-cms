import { Link } from "react-router-dom";

const NotFoundContent = () => (
  <div className="mx-auto flex max-w-lg flex-col items-center text-center">
    <img
      src="/placeholder.svg"
      alt="404 – Stránka sa nenašla"
      className="h-auto w-full max-w-md"
      width={640}
      height={480}
    />
    <Link
      to="/"
      className="mt-6 inline-block font-heading text-slk-brown underline hover:opacity-90"
    >
      Späť na úvod
    </Link>
  </div>
);

export default NotFoundContent;
