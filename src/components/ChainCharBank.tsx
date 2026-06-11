import type { FC } from 'react';
import type { CharTile } from '../types/game';

type Props = {
  tiles: CharTile[];
  onTileClick: (tileId: string) => void;
};

const ChainCharBank: FC<Props> = ({ tiles, onTileClick }) => (
  <div className="char-bank">
    <div className="char-bank-inner">
      {tiles.map(tile => (
        <button
          key={tile.id}
          className={`char-tile${tile.used ? ' used' : ''}`}
          onClick={() => onTileClick(tile.id)}
          disabled={tile.used}
        >
          {tile.value}
        </button>
      ))}
    </div>
  </div>
);

export default ChainCharBank;
