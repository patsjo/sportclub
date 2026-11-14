import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { PostJsonData } from '../utils/api';
import { IMobxClubModel } from './mobxClubModel';
import { ISessionModel } from './sessionModel';

export type SocialTargetType = 'NEWS' | 'CALENDAR' | 'MAP' | 'CUP_RACE' | 'CUP_REPORT';
export type SocialReaction = 'LIKE' | 'DISLIKE' | 'HEART';
export const socialReactions: { reaction: SocialReaction; emoji: string }[] = [
  { reaction: 'LIKE', emoji: '👍' },
  { reaction: 'DISLIKE', emoji: '👎' },
  { reaction: 'HEART', emoji: '❤️' }
];

export interface ISocialTarget {
  targetType: SocialTargetType;
  targetId: string;
}

export interface ISocialSummary extends ISocialTarget {
  counts: Record<SocialReaction, number>;
  myReaction: SocialReaction | null;
  comments: number;
}

export interface ISocialComment {
  commentId: number;
  name: string;
  pictureUrl: string | null;
  text: string;
  creDate: string;
  isMine: boolean;
  canDelete: boolean;
}

export interface ISocialDetails extends ISocialSummary {
  reactions: { reaction: SocialReaction; name: string }[];
  commentList: ISocialComment[];
}

/** The server only takes A-Z, a-z, 0-9, _ and - (e.g. the calendar has event#123) */
export const socialTargetId = (targetId: string | number) =>
  String(targetId)
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .slice(0, 64);

export const socialKey = (targetType: SocialTargetType, targetId: string | number) =>
  `${targetType}#${socialTargetId(targetId)}`;

/** The most a request may ask for, the same as in social/jsonSocialQuery.php */
const maxTargets = 200;

/**
 * Reactions and comments, the summaries for everything shown on a page are fetched in one request.
 * Fetched again when the login changes, since "my reaction" depends on it.
 */
export class SocialModel {
  summaries = observable.map<string, ISocialSummary>();
  details = observable.map<string, ISocialDetails>();
  private pending = new Map<string, ISocialTarget>();
  private requested = new Set<string>();
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private clubModel: IMobxClubModel,
    private sessionModel: ISessionModel
  ) {
    makeObservable(this, { setDetails: action });
    reaction(
      () => `${this.sessionModel.token ?? ''}#${this.sessionModel.id ?? ''}#${this.sessionModel.isGuest}`,
      () => this.refresh()
    );
  }

  get enabled() {
    return !!this.clubModel.social?.queryUrl;
  }

  /** Asks for the summary, together with the other items on the page */
  request(targetType: SocialTargetType, targetId: string | number) {
    const key = socialKey(targetType, targetId);
    if (!this.enabled || this.requested.has(key) || socialTargetId(targetId).length === 0) return;
    this.requested.add(key);
    this.pending.set(key, { targetType, targetId: socialTargetId(targetId) });
    if (!this.timer) this.timer = setTimeout(() => this.flush(), 40);
  }

  private async flush() {
    this.timer = undefined;
    const url = this.clubModel.social?.queryUrl;
    const targets = [...this.pending.values()];
    this.pending.clear();
    if (!url || targets.length === 0) return;

    for (let i = 0; i < targets.length; i += maxTargets) {
      const chunk = targets.slice(i, i + maxTargets);
      try {
        const json = await PostJsonData<{ summaries: ISocialSummary[] }>(
          url,
          { iType: 'SUMMARY', targets: chunk },
          true,
          this.sessionModel.authorizationHeader
        );
        runInAction(() => json?.summaries.forEach(summary => this.setSummary(summary)));
      } catch (error) {
        // Asked again when the item is shown the next time
        chunk.forEach(target => this.requested.delete(socialKey(target.targetType, target.targetId)));
        console.warn(
          `Reactions and comments could not be loaded (${url}): ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }

  private setSummary(summary: ISocialSummary) {
    this.summaries.set(socialKey(summary.targetType, summary.targetId), summary);
  }

  setDetails(details: ISocialDetails) {
    const { reactions, commentList, ...summary } = details;
    this.setSummary(summary);
    this.details.set(socialKey(details.targetType, details.targetId), { ...summary, reactions, commentList });
  }

  private refresh() {
    const keys = [...this.summaries.values()].map(summary => ({
      targetType: summary.targetType,
      targetId: summary.targetId
    }));
    const detailKeys = [...this.details.values()].map(details => ({
      targetType: details.targetType,
      targetId: details.targetId
    }));
    this.requested.clear();
    keys.forEach(target => this.request(target.targetType, target.targetId));
    detailKeys.forEach(target => this.loadDetails(target.targetType, target.targetId).catch(() => undefined));
  }

  async loadDetails(targetType: SocialTargetType, targetId: string | number) {
    const url = this.clubModel.social?.queryUrl;
    if (!url) return;
    const details = await PostJsonData<ISocialDetails>(
      url,
      { iType: 'DETAILS', targetType, targetId: socialTargetId(targetId) },
      true,
      this.sessionModel.authorizationHeader
    );
    if (details) this.setDetails(details);
  }

  private async save(data: object) {
    const url = this.clubModel.social?.updateUrl;
    if (!url) return;
    const details = await PostJsonData<ISocialDetails>(url, data, true, this.sessionModel.authorizationHeader, 1);
    if (details) this.setDetails(details);
  }

  /** null removes my reaction, the summary is changed directly and back if it fails */
  async react(targetType: SocialTargetType, targetId: string | number, newReaction: SocialReaction | null) {
    const key = socialKey(targetType, targetId);
    const old = this.summaries.get(key);
    if (old) {
      const counts = { ...old.counts };
      if (old.myReaction) counts[old.myReaction] = Math.max(0, counts[old.myReaction] - 1);
      if (newReaction) counts[newReaction] = counts[newReaction] + 1;
      runInAction(() => this.setSummary({ ...old, counts, myReaction: newReaction }));
    }
    try {
      await this.save({ iType: 'REACTION', targetType, targetId: socialTargetId(targetId), reaction: newReaction });
    } catch (error) {
      if (old) runInAction(() => this.setSummary(old));
      throw error;
    }
  }

  comment(targetType: SocialTargetType, targetId: string | number, text: string) {
    return this.save({ iType: 'COMMENT', targetType, targetId: socialTargetId(targetId), text });
  }

  deleteComment(commentId: number) {
    return this.save({ iType: 'DELETE_COMMENT', commentId });
  }
}
