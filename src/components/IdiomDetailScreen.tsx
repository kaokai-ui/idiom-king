import type { FC } from 'react';
import type { IdiomEntry } from '../types/game';
import IdiomDetailView from './IdiomDetailView';

type Props = {
  detailView: 'unfamiliar' | 'mastered';
  starredIdioms: IdiomEntry[];
  knownIdioms: IdiomEntry[];
  onBack: () => void;
  onRemove: (type: 'unfamiliar' | 'mastered', id: string) => void;
};

const IdiomDetailScreen: FC<Props> = ({
  detailView,
  starredIdioms,
  knownIdioms,
  onBack,
  onRemove,
}) => {
  const items = detailView === 'unfamiliar' ? starredIdioms : knownIdioms;
  const title = detailView === 'unfamiliar' ? '陌生成語' : '已會成語';
  const tagClass = detailView === 'unfamiliar' ? 'idiom-card--starred' : 'idiom-card--known';
  const emptyMessage = detailView === 'unfamiliar'
    ? '尚無陌生成語，在閃卡練習中點選「加入生詞表」即可新增'
    : '尚無已會成語，在閃卡練習中點選「加入已會」即可新增';

  return (
    <IdiomDetailView
      title={title}
      emptyMessage={emptyMessage}
      tagClass={tagClass}
      items={items.map(i => ({ id: i.id, text: i.text, usage: i.usage }))}
      onBack={onBack}
      onRemove={(id) => onRemove(detailView, id)}
    />
  );
};

export default IdiomDetailScreen;
