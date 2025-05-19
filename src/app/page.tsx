"use client";

import { useEffect } from "react";

type Turno =
  | "Mattino"
  | "MattinoQuarto"
  | "MattinoInfermieristica"
  | "Pomeriggio"
  | "PomeriggioQuarto"
  | "Spezzato"
  | "SpezzatoQuarto"
  | "Notte"
  | "Riposo";

type GiornoSettimana = "Lun" | "Mar" | "Mer" | "Gio" | "Ven" | "Sab" | "Dom";

interface OSS {
  id: string;
  nome: string;
  oreSettimanali: number;
  giorniFissi?: GiornoSettimana[];
  storicoTurni: Record<string, Turno>;
  storicoPiani: Record<string, number>; // per rotazione dei piani
  pianoCorrente: number; // aggiunto per gestire la rotazione tra piani
  assenze?: Record<string, "ferie" | "permesso" | "malattia">;
}

const nomiFake = [
  "Anna", "Marco", "Luca", "Sara", "Giulia", "Francesco", "Elena",
  "Davide", "Chiara", "Simone", "Martina", "Alessandro", "Laura",
  "Stefano", "Valentina", "Giorgio", "Silvia", "Fabio", "Michela",
  "Claudio", "Irene", "Andrea", "Serena", "Tommaso", "Beatrice",
  "Riccardo", "Federica"
];

const giorniSettimana: GiornoSettimana[] = [
  "Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"
];

export default function Page() {

function generaListaOSS(): OSS[] {
  const oss: OSS[] = [];

  for (let i = 0; i < 23; i++) {
    oss.push({
      id: `oss${i + 1}`,
      nome: nomiFake[i % nomiFake.length] + ` ${i + 1}`,
      oreSettimanali: 38,
      storicoTurni: {},
      storicoPiani: {},
      pianoCorrente: (i % 3) + 1,
      assenze: {}
    });
  }

  oss.push({
    id: "pt1",
    nome: "PT 50%",
    oreSettimanali: 19,
    giorniFissi: ["Mar", "Mer"],
    storicoTurni: {},
    storicoPiani: {},
    pianoCorrente: 1,
    assenze: {}
  });

  oss.push({
    id: "pt2",
    nome: "PT 70% A",
    oreSettimanali: 25.2,
    giorniFissi: ["Mer", "Gio", "Ven"],
    storicoTurni: {},
    storicoPiani: {},
    pianoCorrente: 2,
    assenze: {}
  });

  oss.push({
    id: "pt3",
    nome: "PT 70% B",
    oreSettimanali: 25.2,
    giorniFissi: ["Lun", "Mar", "Sab"],
    storicoTurni: {},
    storicoPiani: {},
    pianoCorrente: 3,
    assenze: {}
  });

  oss.push({
    id: "pt4",
    nome: "PT 70% C",
    oreSettimanali: 25.2,
    giorniFissi: ["Mar", "Mer", "Gio"],
    storicoTurni: {},
    storicoPiani: {},
    pianoCorrente: 1,
    assenze: {}
  });

  return oss;
}

function haRiposoObbligatorio(oss: OSS, giorno: string): boolean {
  const date = new Date(giorno);
  for (let i = 1; i <= 2; i++) {
    const giornoPrecedente = new Date(date);
    giornoPrecedente.setDate(date.getDate() - i);
    const giornoStr = giornoPrecedente.toISOString().split("T")[0];
    if (oss.storicoTurni[giornoStr] === "Notte") {
      return true;
    }
  }
  return false;
}

function haTurnoNonConformePrecedente(oss: OSS, giorno: string): boolean {
  const date = new Date(giorno);
  const giornoPrecedente = new Date(date);
  giornoPrecedente.setDate(date.getDate() - 1);
  const giornoStr = giornoPrecedente.toISOString().split("T")[0];
  const turno = oss.storicoTurni[giornoStr];
  return turno === "Pomeriggio" || turno === "PomeriggioQuarto" || turno === "Spezzato" || turno === "SpezzatoQuarto";
}

function ruotaPianoCorrente(oss: OSS) {
  oss.pianoCorrente = (oss.pianoCorrente % 3) + 1;
}

function oreLavorateNellaSettimana(oss: OSS, giorno: string): number {
  const data = new Date(giorno);
  const day = data.getDay();
  const inizioSettimana = new Date(data);
  inizioSettimana.setDate(data.getDate() - ((day + 6) % 7));
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(inizioSettimana);
    d.setDate(inizioSettimana.getDate() + i);
    const dStr = d.toISOString().split("T")[0];
    const turno = oss.storicoTurni[dStr];
    if (!turno || turno === "Riposo") continue;
    if (turno.includes("Notte")) total += 10;
    else if (turno.includes("Spezzato")) total += 7.6;
    else total += 6.4;
  }

  return total;
}

function assegnaTurniGiornalieri(ossList: OSS[], giorno: string, giornoSettimana: GiornoSettimana) {
  const turniRichiesti: Turno[] = [
    "Mattino", "Mattino", "Mattino", "MattinoQuarto", "MattinoInfermieristica",
    "Pomeriggio", "Pomeriggio", "Pomeriggio", "PomeriggioQuarto",
    "Spezzato", "Spezzato", "SpezzatoQuarto",
    "Notte", "Notte"
  ];

  const turniAssegnati: Record<string, Turno> = {};
  const ossDisponibili = ossList.filter(oss => {
    if (oss.assenze && giorno in oss.assenze!) return false;
    if (oss.storicoTurni[giorno]) return false;
    if (oss.giorniFissi && !oss.giorniFissi.includes(giornoSettimana)) return false;
    if (haRiposoObbligatorio(oss, giorno)) return false;
    const oreAttuali = oreLavorateNellaSettimana(oss, giorno);
    if (oreAttuali >= oss.oreSettimanali) return false;
    return true;
  });

  for (const turno of turniRichiesti) {
    const candidatoIndex = ossDisponibili.findIndex(oss => {
      if (turno.startsWith("Mattino")) {
        return !haTurnoNonConformePrecedente(oss, giorno);
      }
      return true;
    });

    if (candidatoIndex === -1) continue;
    const candidato = ossDisponibili.splice(candidatoIndex, 1)[0];
    candidato.storicoTurni[giorno] = turno;
    turniAssegnati[candidato.nome] = turno;

    const piano = turno.includes("Quarto") || turno === "MattinoInfermieristica" ? 4 : candidato.pianoCorrente;
    if (piano <= 3) {
      candidato.storicoPiani[giorno] = piano;
      ruotaPianoCorrente(candidato);
    }
  }

  return turniAssegnati;
}

function assegnaTurniPerMese(
  ossList: OSS[],
  dataInizio: string,
  numeroGiorni: number = 30
) {
  // Copia per non modificare direttamente l'originale
  const ossCopia = ossList.map(oss => ({
    ...oss,
    storicoTurni: { ...oss.storicoTurni },
    storicoPiani: { ...oss.storicoPiani },
  }));

  const risultati: Record<string, Record<string, Turno>> = {}; // giorno -> nome -> turno

  for (let i = 0; i < numeroGiorni; i++) {
    const dataCorrente = new Date(dataInizio);
    dataCorrente.setDate(dataCorrente.getDate() + i);
    const giornoISO = dataCorrente.toISOString().split("T")[0];
    const giornoSettimanaIndex = dataCorrente.getDay(); // 0 domenica ... 6 sabato

    // Mappa indice a GiornoSettimana con domenica=Dom=6, lunedì=0 ...
    const giornoSettimanaMap: GiornoSettimana[] = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const giornoSettimana = giornoSettimanaMap[giornoSettimanaIndex];

    // Correzione perché la tua definizione ha Lun come primo (0)
    // Mappa da getDay domenica=0 a Dom=6
    const giornoSettimanaCorretto: GiornoSettimana = giornoSettimana === "Dom" ? "Dom" : giornoSettimana;

    // Assegna i turni per il giorno corrente
    const turniDelGiorno = assegnaTurniGiornalieri(ossCopia, giornoISO, giornoSettimanaCorretto);

    risultati[giornoISO] = turniDelGiorno;
  }

  return risultati;
}

    useEffect(() => {
        // Esempio d'uso settimanale
        const listaOSS = generaListaOSS();
        const turniDelMese = assegnaTurniPerMese(listaOSS, "2025-05-19", 30);
        console.log(turniDelMese);
    }, []);

    return (<></>);
};