import type { FC } from 'react';
import type { IdiomV2Entry, IdiomV2StarredEntry } from '../../types/idiomV2';
import { IDIOM_LEVEL_LABELS } from '../../constants/idiomLevels';
import IdiomDetailView from '../IdiomDetailView';

type Props = {
  detailView: 'unfamiliar' | 'mastered';
  starredIdioms: IdiomV2StarredEntry[];
  knownIdioms: IdiomV2Entry[];
  onBack: () => void;
  onRemoveFromStarred: (id: string) => void;
  onRemoveKnown: (id: string) => void;
};

const IdiomDetailV2Screen: FC<Props> = ({
  detailView,
  starredIdioms,
  knownIdioms,
  onBack,
  onRemoveFromStarred,
  onRemoveKnown,
}) => {
  const isUnfamiliar = detailView === 'unfamiliar';
  const title = isUnfamiliar ? '陌生成語' : '已會成語';
  const tagClass = isUnfamiliar ? 'idiom-card--starred' : 'idiom-card--known';
  const emptyMessage = isUnfamiliar
    ? '尚無陌生成語，在閃卡練習中點選「加入生詞表」即可新增'
    : '尚無已會成語，在閃卡練習中點選「加入已會」即可新增';

  const items = isUnfamiliar
    ? starredIdioms.map(entry => ({
        id: entry.id,
        text: entry.text,
        usage: entry.usage,
        levelLabel: entry.levelLabel || IDIOM_LEVEL_LABELS[entry.level],
      }))
    : knownIdioms.map(entry => ({ id: entry.id, text: entry.text, usage: entry.usage }));

  return (
    <IdiomDetailView
      title={title}
      emptyMessage={emptyMessage}
      tagClass={tagClass}
      items={items}
      onBack={onBack}
      onRemove={isUnfamiliar ? onRemoveFromStarred : onRemoveKnown}
    />
  );
};

export default IdiomDetailV2Screen;
