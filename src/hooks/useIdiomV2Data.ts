import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { IdiomLevel, IdiomV2Entry, IdiomV2Catalog } from '../types/idiomV2';
import { loadCatalog, loadLevelData, getCachedLevelData } from '../data/idiomV2DataClient';
import { IDIOM_LEVEL_LABELS } from '../constants/idiomLevels';

type DataState = {
  idioms: IdiomV2Entry[];
  idiomsById: Record<string, IdiomV2Entry>;
  idiomIdByText: Record<string, string>;
  charIndex: Map<string, number[]>;
  catalog: IdiomV2Catalog | null;
  isLoading: boolean;
  error: string | null;
};

type DataAction =
  | { type: 'SET_LOADING' }
  | { type: 'LOAD_CACHED'; payload: Omit<DataState, 'catalog' | 'isLoading' | 'error'> }
  | { type: 'LOAD_SUCCESS'; payload: Omit<DataState, 'catalog' | 'isLoading' | 'error'> & { catalog?: IdiomV2Catalog } }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SET_CATALOG'; payload: IdiomV2Catalog };

const initialState: DataState = {
  idioms: [],
  idiomsById: {},
  idiomIdByText: {},
  charIndex: new Map(),
  catalog: null,
  isLoading: true,
  error: null,
};

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_CACHED':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null,
      };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        idioms: action.payload.idioms,
        idiomsById: action.payload.idiomsById,
        idiomIdByText: action.payload.idiomIdByText,
        charIndex: action.payload.charIndex,
        catalog: action.payload.catalog ?? state.catalog,
        isLoading: false,
        error: null,
      };
    case 'LOAD_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_CATALOG':
      return { ...state, catalog: action.payload };
    default:
      return state;
  }
}

export function useIdiomV2Data(activeLevel: IdiomLevel) {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const activeRequestRef = useRef(0);
  const catalogLoadedRef = useRef(false);

  const loadData = useCallback(async (level: IdiomLevel) => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    dispatch({ type: 'SET_LOADING' });
    try {
      const cat = await loadCatalog();
      catalogLoadedRef.current = true;
      if (activeRequestRef.current !== requestId) return;
      const data = await loadLevelData(level);
      if (activeRequestRef.current !== requestId) return;
      dispatch({ type: 'LOAD_SUCCESS', payload: { ...data, catalog: cat } });
    } catch (e) {
      if (activeRequestRef.current !== requestId) return;
      dispatch({ type: 'LOAD_ERROR', payload: String(e) });
    }
  }, []);

  useEffect(() => {
    const cached = getCachedLevelData(activeLevel);
    if (cached) {
      dispatch({ type: 'LOAD_CACHED', payload: cached });
      // Catalog is level-independent; only fetch it once.
      if (!catalogLoadedRef.current) {
        loadCatalog()
          .then(cat => {
            catalogLoadedRef.current = true;
            dispatch({ type: 'SET_CATALOG', payload: cat });
          })
          .catch(() => {});
      }
      return;
    }
    void loadData(activeLevel);
  }, [activeLevel, loadData]);

  const retry = useCallback(() => {
    void loadData(activeLevel);
  }, [activeLevel, loadData]);

  return {
    idioms: state.idioms,
    idiomsById: state.idiomsById,
    idiomIdByText: state.idiomIdByText,
    charIndex: state.charIndex,
    catalog: state.catalog,
    activeLevelLabel: IDIOM_LEVEL_LABELS[activeLevel],
    isLoading: state.isLoading,
    isReady: !state.isLoading && !state.error,
    error: state.error,
    retry,
  };
}
