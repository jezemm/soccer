import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Failed to load — tap to retry</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emjsc-navy text-white text-xs font-black uppercase rounded-2xl active:scale-95 transition-transform"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
