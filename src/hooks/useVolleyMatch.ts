// src/hooks/useVolleyMatch.ts
import { useState } from 'react';

type Player = { id: string; number: number; name: string; isLibero?: boolean };
type TeamSide = 'home' | 'away';

export function useVolleyMatch() {
  // Sets y Posiciones
  const [sets, setSets] = useState([{ number: 1, home: 0, away: 0, finished: false }]);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  
  const [posHome, setPosHome] = useState<Player[]>([]);
  const [posAway, setPosAway] = useState<Player[]>([]);
  const [benchHome, setBenchHome] = useState<Player[]>([]);
  const [benchAway, setBenchAway] = useState<Player[]>([]);
  
  const [servingTeam, setServingTeam] = useState<TeamSide | null>(null);
  
  // HISTORIAL DE PUNTOS (Para consultar estados previos)
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

  // ROTACIÓN NORMAL (Sentido Horario)
  const rotateTeam = (currentPos: Player[]) => {
      const newPos = [...currentPos];
      const first = newPos.shift(); 
      if (first) newPos.push(first);
      return newPos;
  };

  // ROTACIÓN INVERSA (Para volver atrás)
  const reverseRotateTeam = (currentPos: Player[]) => {
      const newPos = [...currentPos];
      const last = newPos.pop(); // Sacamos el último (Pos 6)
      if (last) newPos.unshift(last); // Lo ponemos primero (Pos 1)
      return newPos;
  };

  // --- SUMAR PUNTO ---
  const addPoint = (team: TeamSide) => {
      // Guardar Snapshot
      const snapshot = JSON.parse(JSON.stringify({
          sets, posHome, posAway, benchHome, benchAway, servingTeam, currentSetIdx
      }));
      setHistory(prev => [...prev, snapshot]);

      let nextPosHome = [...posHome];
      let nextPosAway = [...posAway];
      
      // Si recupera saque -> Rota
      if (servingTeam && servingTeam !== team) {
          if (team === 'home') nextPosHome = rotateTeam(posHome);
          else nextPosAway = rotateTeam(posAway);
      }

      setServingTeam(team);
      setPosHome(nextPosHome);
      setPosAway(nextPosAway);
      
      setSets(prev => prev.map((set, index) => {
          if (index === currentSetIdx) {
              return { ...set, [team]: set[team] + 1 };
          }
          return set;
      }));
  };

  // --- RESTAR PUNTO (Lógica Correctora por Equipo) ---
  const subtractPoint = (team: TeamSide) => {
      if (sets[currentSetIdx][team] === 0) return; // No se puede restar si es 0

      let shouldReverseRotation = false;
      const opponent = team === 'home' ? 'away' : 'home';

      // 1. ANÁLISIS: ¿Corresponde volver atrás la rotación?
      // Solo si el equipo ESTÁ sacando ahora mismo.
      if (servingTeam === team) {
          // Buscamos en el historial el momento exacto antes de este punto
          // (El último estado donde el score de este equipo era "Actual - 1")
          const prevScoreState = [...history].reverse().find(h => 
              h.currentSetIdx === currentSetIdx && 
              h.sets[currentSetIdx][team] === sets[currentSetIdx][team] - 1
          );

          if (prevScoreState) {
              // Si en el estado anterior el equipo NO sacaba, significa que 
              // este punto fue el que les dio el saque y la rotación.
              // Entonces, al borrarlo, debemos devolver todo.
              if (prevScoreState.servingTeam !== team) {
                  shouldReverseRotation = true;
              }
          }
      }

      // 2. APLICAR CAMBIOS
      if (shouldReverseRotation) {
          // Rotar hacia atrás
          if (team === 'home') setPosHome(prev => reverseRotateTeam(prev));
          else setPosAway(prev => reverseRotateTeam(prev));
          
          // Devolver saque al rival
          setServingTeam(opponent);
      }

      // Restar el punto numérico
      setSets(prev => prev.map((s, i) => 
          i === currentSetIdx ? { ...s, [team]: s[team] - 1 } : s
      ));
      
      // Nota: No borramos el historial para permitir rehacer acciones si fuera necesario, 
      // o simplemente dejamos que el historial crezca linealmente.
  };

  // --- OTRAS FUNCIONES ---
  const addPlayerToBench = (team: TeamSide, player: Player) => {
      const currentList = team === 'home' ? benchHome : benchAway;
      const currentCourt = team === 'home' ? posHome : posAway;
      
      // Evitar duplicados
      if (currentList.find(p => p.id === player.id) || currentCourt.find(p => p.id === player.id)) return;
      
      if (team === 'home') setBenchHome(prev => [...prev, player]);
      else setBenchAway(prev => [...prev, player]);
  };

  const substitutePlayer = (team: TeamSide, playerOutId: string, playerIn: Player) => {
      const setterPos = team === 'home' ? setPosHome : setPosAway;
      const setterBench = team === 'home' ? setBenchHome : setBenchAway;
      const currentPos = team === 'home' ? posHome : posAway;
      
      const playerOut = currentPos.find(p => p.id === playerOutId);
      if (!playerOut) return;

      // Swap en cancha
      setterPos(prev => prev.map(p => p.id === playerOutId ? playerIn : p));
      
      // Swap en banca (Sale el entrante, entra el saliente)
      setterBench(prev => {
           const filtered = prev.filter(p => p.id !== playerIn.id);
           return [...filtered, playerOut];
      });
  };

  const finishSet = () => {
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