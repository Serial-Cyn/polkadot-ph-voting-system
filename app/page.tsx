import { redirect } from "next/navigation";

export default function Home() {
  // redirect root to /login
  redirect('/login');
}
