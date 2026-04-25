import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, FileText, Check, X } from 'lucide-react';
import { CLUB_LOGO } from '../lib/constants';

function Section({ title, icon, defaultOpen = false, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-colors active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-black uppercase tracking-widest text-emjsc-navy">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 text-[11px] font-medium text-slate-600 leading-relaxed bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => (
  <p className="font-black uppercase tracking-wide text-emjsc-navy text-[10px] mt-4 first:mt-0">{children}</p>
);

const TermsContent = () => (
  <>
    <H>About this app</H>
    <P>EMJSC Hub is a private team management app for East Malvern Junior Soccer Club U8 White Saturday squad members and their families. Access is by invitation only.</P>
    <H>Authorised use</H>
    <P>This app is strictly for current squad members and authorised family members. You must not share your login credentials or any content from this app with anyone outside the squad. Screenshots or copies of squad member information must not be shared on social media or any public platform.</P>
    <H>Your conduct</H>
    <P>All content you post — including profile descriptions and messages — must be respectful and appropriate. Content that is offensive, harassing, or inappropriate will be removed. Repeat violations may result in your access being revoked.</P>
    <H>Duties and availability</H>
    <P>When you sign up for a match duty (e.g. Goalie, Snacks, Referee) you are committing to fulfil that role on match day. If you can no longer attend, please use the swap feature or contact the coach or manager as early as possible so cover can be arranged.</P>
    <H>No warranty</H>
    <P>EMJSC Hub is provided as a convenience tool for team coordination. While we aim to keep fixture, duty, and contact information accurate, we cannot guarantee its completeness. Always confirm important information directly with your coach or manager.</P>
    <H>Changes</H>
    <P>These terms may be updated from time to time. You will be asked to re-accept when material changes are made.</P>
  </>
);

const PrivacyContent = () => (
  <>
    <H>What we collect</H>
    <P>We collect the following information you provide: your first name and initial (used as your player identity), an optional profile bio or skills description, and your customised avatar image. We also record your match availability choices and any duty sign-ups you make.</P>
    <H>How your data is used</H>
    <P>Your information is used solely to coordinate the team — to display the squad list, manage match duties, and facilitate communication between squad families. It is never used for marketing or sold to any third party.</P>
    <H>Who can see your data</H>
    <P>Your name, avatar, and profile bio are visible to all logged-in squad members. Your availability and duty assignments are also visible to the whole squad. Only coaches and managers can see detailed administrative information.</P>
    <H>Data storage</H>
    <P>App data is stored securely in Google Firebase (Firestore), hosted in Australia. Your session is stored locally on your device using your browser's localStorage.</P>
    <H>Avatar images</H>
    <P>Avatars are generated using the Avataaars service (avataaars.io), an external image generation API. Your avatar configuration is sent to that service as URL parameters to render an image. No personally identifiable information is included in those requests.</P>
    <H>Children's privacy</H>
    <P>Players are identified only by a first name and surname initial. No full names, contact details, dates of birth, or photos are collected for players. Parents and guardians manage all login activity on behalf of their children.</P>
    <H>Your rights</H>
    <P>You can update or remove your profile bio and avatar at any time from the Squad page. To request full deletion of your data, contact the team manager. When your child leaves the squad their data will be removed.</P>
    <H>Contact</H>
    <P>For any privacy concerns, please contact the EMJSC U8 White Saturday team manager via the Messages tab or through your usual team communication channel.</P>
  </>
);

interface TermsModalProps {
  teamLogoUrl?: string | null;
  onAccept: () => void;
}

export function TermsModal({ teamLogoUrl, onAccept }: TermsModalProps) {
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col mobile-container">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-4 pt-6 text-center">
            <img src={teamLogoUrl || CLUB_LOGO} alt="EMJSC" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-2xl font-black text-emjsc-navy uppercase tracking-tight leading-none">Welcome to EMJSC Hub</h1>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                Before you continue, please read and accept our Terms of Use and Privacy Policy.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Section title="Terms of Use" icon={<FileText className="w-4 h-4 text-emjsc-red shrink-0" />}>
              <TermsContent />
            </Section>
            <Section title="Privacy Policy" icon={<Shield className="w-4 h-4 text-emjsc-red shrink-0" />}>
              <PrivacyContent />
            </Section>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer" onClick={() => setTermsChecked(c => !c)}>
              <div className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${termsChecked ? 'bg-emjsc-navy border-emjsc-navy' : 'border-slate-300 hover:border-emjsc-navy'}`}>
                {termsChecked && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs font-bold text-slate-700 leading-relaxed select-none">
                I have read and accept the <span className="text-emjsc-navy font-black">Terms of Use</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer" onClick={() => setPrivacyChecked(c => !c)}>
              <div className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${privacyChecked ? 'bg-emjsc-navy border-emjsc-navy' : 'border-slate-300 hover:border-emjsc-navy'}`}>
                {privacyChecked && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs font-bold text-slate-700 leading-relaxed select-none">
                I have read and accept the <span className="text-emjsc-navy font-black">Privacy Policy</span>
              </span>
            </label>
          </div>

          <button
            onClick={onAccept}
            disabled={!termsChecked || !privacyChecked}
            className="w-full bg-emjsc-navy text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-emjsc-red"
          >
            Continue to EMJSC Hub
          </button>

          <p className="text-center text-[9px] text-slate-400 font-bold pb-6">
            You can revisit these documents at any time via Help & FAQ.
          </p>
        </div>
      </div>
    </div>
  );
}

type DocView = 'terms' | 'privacy';

interface DocModalProps {
  doc: DocView;
  onClose: () => void;
}

export function DocModal({ doc, onClose }: DocModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            {doc === 'terms'
              ? <FileText className="w-4 h-4 text-emjsc-red" />
              : <Shield className="w-4 h-4 text-emjsc-red" />}
            <h2 className="text-sm font-black text-emjsc-navy uppercase tracking-tight">
              {doc === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 active:scale-95 transition-all">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 text-[11px] font-medium text-slate-600 leading-relaxed">
          {doc === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </div>
  );
}
