// TRIAL LOCK PAGE — to remove later:
// 1. Delete this file
// 2. In src/App.tsx remove the `TRIAL_ENDED` import and the early-return block.
import { Lock, Mail, Phone } from "lucide-react";

export default function TrialEnded() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Free Trial Ended
        </h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Your free trial of the Hospital Information Management System has ended.
          The system is now locked. Please contact the administrator to renew your
          subscription and restore access.
        </p>

        <div className="bg-slate-50 rounded-xl p-5 space-y-3 text-left mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Contact support to reactivate your account</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Phone className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Reach out to your system provider for renewal</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          All your data is safe and will be available once your subscription is renewed.
        </p>
      </div>
    </div>
  );
}
