"use client";

import { useState, useTransition } from "react";
import { updateUserRole, removeFamilyMember } from "@/lib/actions/users";
import { inviteFamilyMember } from "@/lib/actions/invites";

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
  lineBound: boolean;
};

function MemberRow({ member, canRemove }: { member: Member; canRemove: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(role: "ADMIN" | "MEMBER") {
    startTransition(async () => {
      await updateUserRole(member.id, role);
    });
  }

  function handleRemove() {
    if (!confirm(`ลบ ${member.name ?? member.email} ออกจากครอบครัว?`)) return;
    startTransition(async () => {
      await removeFamilyMember(member.id);
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 px-3 rounded-xl bg-slate-50 transition-opacity ${
        pending ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">
          {member.name ?? member.email}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {member.email}
          {member.lineBound ? " · ผูกไลน์แล้ว" : " · ยังไม่ผูกไลน์"}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <select
          value={member.role}
          disabled={pending}
          onChange={(e) => handleRoleChange(e.target.value as "ADMIN" | "MEMBER")}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 text-slate-600 font-medium disabled:opacity-40"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        {canRemove && (
          <button
            type="button"
            disabled={pending}
            onClick={handleRemove}
            className="text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-xl px-3 py-2 transition-colors disabled:opacity-40"
          >
            ลบ
          </button>
        )}
      </div>
    </div>
  );
}

type InviteState =
  | { step: "idle" }
  | { step: "error"; message: string }
  | { step: "success"; qrDataUrl: string; loginUrl: string };

function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<InviteState>({ step: "idle" });
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteFamilyMember(email);
      if ("error" in result) {
        setState({ step: "error", message: result.error });
      } else {
        setState({ step: "success", qrDataUrl: result.qrDataUrl, loginUrl: result.loginUrl });
        setEmail("");
      }
    });
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder="อีเมลสมาชิกใหม่"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className="min-w-0 flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 text-slate-700 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 text-xs font-medium bg-purple-500 text-white rounded-xl px-4 py-2 hover:bg-purple-600 transition-colors disabled:opacity-40"
        >
          เชิญ
        </button>
      </form>

      {state.step === "error" && (
        <p className="text-[11px] text-rose-500 mt-2">{state.message}</p>
      )}

      {state.step === "success" && (
        <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not an optimizable remote/local asset */}
          <img src={state.qrDataUrl} alt="QR code สำหรับเข้าสู่ระบบ" className="w-20 h-20 rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-600 font-medium">เชิญสำเร็จ</p>
            <p className="text-[11px] text-slate-400">
              ให้สมาชิกสแกน QR นี้ด้วยมือถือ แล้วเข้าสู่ระบบด้วย Google ด้วยอีเมลที่เพิ่งเพิ่ม
            </p>
            <p className="text-[11px] text-purple-500 truncate mt-1">{state.loginUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function FamilyMembersManager({
  members,
  currentUserId,
  currentUserRole,
}: {
  members: Member[];
  currentUserId: string;
  currentUserRole: "ADMIN" | "MEMBER";
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
      <h3 className="font-bold text-slate-800 text-sm mb-1">สมาชิกครอบครัว</h3>
      <p className="text-xs text-slate-400 mb-4">
        ทุกคนเห็นข้อมูลการเงินร่วมกันอยู่แล้ว — บทบาทนี้ไว้เผื่อใช้แยกสิทธิ์ในอนาคต
      </p>
      <div className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            canRemove={currentUserRole === "ADMIN" && m.id !== currentUserId}
          />
        ))}
        {members.length === 0 && (
          <p className="text-xs text-slate-400 py-2">ยังไม่มีสมาชิกเข้าสู่ระบบ</p>
        )}
      </div>
      <InviteMemberForm />
    </div>
  );
}
