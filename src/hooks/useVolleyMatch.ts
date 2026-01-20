import { useState } from 'react';

type Player = { id: string; number: number; name: string; isLibero?: boolean };
type TeamSide = 'home' | 'away';

export function useVolleyMatch() {
  // Sets
  const [sets, setSets] = useState([{ number: 1, home: 0, away: 0, finished: false }]);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  
  // Posiciones (Array de 6)
  const [posHome, setPosHome] = useState<Player[]>([]);
  const [posAway, setPosAway] = useState<Player[]>([]);
  
  // Banca
  const [benchHome, setBenchHome] = useState<Player[]>([]);
  const [benchAway, setBenchAway] = useState<Player[]>([]);
  
  const [servingTeam, setServingTeam] = useState<TeamSide | null>(null);
  
  // HISTORIAL (Pila LIFO para Deshacer)
  const [history, setHistory] = useState<any[]>([]);

  // Inicialización (Mock)
  const initPositions = () => {
      const home: Player[] = [
          {id:'h1', number:1, name:'Saca'}, {id:'h2', number:2, name:'Ana'},
          {id:'h3', number:3, name:'Bea'}, {id:'h4', number:4, name:'Carla'},
          {id:'h5', number:5, name:'Dani'}, {id:'h6', number:6, name:'Eli'}
      ];
      const homeSubs: Player[] = [{id:'hs1', number:15, name:'Suplente'}];

      const away: Player[] = [
          {id:'a1', number:7, name:'Sol'}, {id:'a2', number:8, name:'Mia'},
          {id:'a3', number:9, name:'Pia'}, {id:'a4', number:10, name:'Luz'},
          {id:'a5', number:11, name:'Vick'}, {id:'a6', number:12, name:'Roc'}
      ];
      const awaySubs: Player[] = [{id:'as1', number:20, name:'Jime'}];

      setPosHome(home); setBenchHome(homeSubs);
      setPosAway(away); setBenchAway(awaySubs);
  };

  // Rotación (Sentido Horario)
  const rotateTeam = (currentPos: Player[]) => {
      const newPos = [...currentPos];
      const first = newPos.shift(); 
      if (first) newPos.push(first);
      return newPos;
  };

  // --- SUMAR PUNTO (+1) ---
  const addPoint = (team: TeamSide) => {
      // 1. Guardar FOTO EXACTA del estado actual en el historial
      // Usamos JSON stringify/parse para romper referencias y hacer copia real
      const snapshot = JSON.parse(JSON.stringify({
          sets, posHome, posAway, benchHome, benchAway, servingTeam, currentSetIdx
      }));
      setHistory(prev => [...prev, snapshot]);

      // 2. Calcular Rotación
      let nextPosHome = [...posHome];
      let nextPosAway = [...posAway];
      
      // Si recupera el saque -> Rota
      if (servingTeam && servingTeam !== team) {
          if (team === 'home') nextPosHome = rotateTeam(posHome);
          else nextPosAway = rotateTeam(posAway);
      }

      setServingTeam(team);
      setPosHome(nextPosHome);
      setPosAway(nextPosAway);
      
      setSets(prev => {
          const newSets = [...prev];
          newSets[currentSetIdx][team]++;
          return newSets;
      });
  };

  // --- RESTAR PUNTO / DESHACER (-1) ---
  const subtractPoint = () => {
      if (history.length === 0) return; // Nada que deshacer

      // Recuperar último estado
      const last = history[history.length - 1];
      
      // Restaurar TODO
      setSets(last.sets);
      setPosHome(last.posHome);
      setPosAway(last.posAway);
      setBenchHome(last.benchHome);
      setBenchAway(last.benchAway);
      setServingTeam(last.servingTeam);
      setCurrentSetIdx(last.currentSetIdx);

      // Borrar ese registro del historial
      setHistory(prev => prev.slice(0, -1));
  };

  // --- AGREGAR JUGADOR DESDE DB ---
  const addPlayerToBench = (team: TeamSide, player: Player) => {
      if (team === 'home') {
          // Evitar duplicados
          if (benchHome.find(p => p.id === player.id) || posHome.find(p => p.id === player.id)) return;
          setBenchHome(prev => [...prev, player]);
      } else {
          if (benchAway.find(p => p.id === player.id) || posAway.find(p => p.id === player.id)) return;
          setBenchAway(prev => [...prev, player]);
      }
  };

  const substitutePlayer = (team: TeamSide, playerOutId: string, playerIn: Player) => {
      // ... (Lógica de sustitución igual que antes) ...
      // Para ahorrar espacio aquí, asumo que mantienes la lógica del paso anterior
      // Si la necesitas, avísame y la pego completa de nuevo.
      const setterPos = team === 'home' ? setPosHome : setPosAway;
      const setterBench = team === 'home' ? setBenchHome : setBenchAway;
      const currentPos = team === 'home' ? posHome : posAway;
      
      const playerOut = currentPos.find(p => p.id === playerOutId);
      if (!playerOut) return;

      setterPos(prev => prev.map(p => p.id === playerOutId ? playerIn : p));
      setterBench(prev => {
           const filtered = prev.filter(p => p.id !== playerIn.id);
           return [...filtered, playerOut];
      });
  };

  const finishSet = () => {
      // Guardar en historial antes de cerrar set por si fue error
      const snapshot = JSON.parse(JSON.stringify({ sets, posHome, posAway, benchHome, benchAway, servingTeam, currentSetIdx }));
      setHistory(prev => [...prev, snapshot]);

      setSets(prev => {
          const newSets = [...prev];
          newSets[currentSetIdx].finished = true;
          if (newSets.length < 5) newSets.push({ number: newSets.length + 1, home: 0, away: 0, finished: false });
          return newSets;
      });
      if (sets.length < 5) setCurrentSetIdx(prev => prev + 1);
  };

  return {
      sets, currentSetIdx, posHome, posAway, benchHome, benchAway,
      servingTeam, setServingTeam, addPoint, subtractPoint, 
      substitutePlayer, finishSet, initPositions, addPlayerToBench
  };
}