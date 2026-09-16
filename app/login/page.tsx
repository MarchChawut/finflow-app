import Image from "next/image";
import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : "/";

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-soft-lg border border-slate-100 p-8 text-center">
        <Image
          src="/img/finflow_logo.png"
          alt="FinFlow"
          width={56}
          height={56}
          className="w-14 h-14 mx-auto rounded-2xl object-cover shadow-md shadow-purple-200 mb-4"
        />
        <h1 className="text-xl font-bold text-slate-800 mb-1">
          FinFlow{" "}
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold align-middle">
            LINE OA
          </span>
        </h1>
        <p className="text-xs text-slate-400 mb-8">
          เข้าสู่ระบบเพื่อจัดการการเงินครอบครัวผ่าน LINE OA
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
          >
            <i className="fa-brands fa-google text-base" />
            เข้าสู่ระบบด้วย Google
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-6">
          เฉพาะอีเมลที่ได้รับอนุญาตในครอบครัวเท่านั้นที่เข้าใช้งานได้
        </p>
      </div>
    </div>
  );
}
