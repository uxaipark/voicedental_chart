interface Field { f: string; g: string; r: string; n: string }

const SITE_FIELDS: Field[] = [
  { f: 'Gingival margin (GM)', g: '6 / tooth', r: '−5 … +12 mm', n: 'Margin position relative to the CEJ. Positive = recession; negative = margin coronal to the CEJ (pseudo-pocket, overgrowth). The sign convention must be fixed before the exam.' },
  { f: 'Probing depth (PD)', g: '6 / tooth', r: '0 … 15 mm', n: 'Free gingival margin to the base of the sulcus, UNC-15 probe, rounded up to the whole millimetre.' },
  { f: 'Attachment level (CAL)', g: '6 / tooth', r: 'computed', n: 'Computed as PD + GM — the measure that defines attachment loss and drives AAP staging. Typing a CAL value back-solves the gingival margin, so the three numbers can never disagree.' },
  { f: 'Bleeding on probing', g: '6 / tooth', r: 'yes / no', n: 'Scored within 30 s of probing. Full-mouth BOP % is the standard inflammation index; ≥ 10 % meets the gingivitis case definition.' },
  { f: 'Suppuration', g: '6 / tooth', r: 'yes / no', n: 'Exudate on pressure — marks an active lesion and raises urgency independently of depth.' },
  { f: 'Plaque', g: '6 / tooth', r: 'yes / no', n: 'Supragingival biofilm; produces the plaque index (PI %) that anchors the home-care discussion.' },
  { f: 'Calculus', g: '6 / tooth', r: 'yes / no', n: 'Sub- or supragingival deposit felt on probing. Supports quadrant SRP justification (D4341 / D4342).' },
  { f: 'Gingival index', g: '6 / tooth', r: '0 · 1 · 2 · 3', n: 'Löe & Silness. Optional, but the only field that separates colour and oedema change from frank bleeding.' },
  { f: 'MGJ / keratinized width', g: '1 / surface *', r: '0 … 12 mm', n: 'Gingival margin to mucogingival junction. Maxillary facial and mandibular facial + lingual. Under 2 mm flags a mucogingival defect.' },
]

const TOOTH_FIELDS: Field[] = [
  { f: 'Mobility', g: '1 / tooth', r: '0 · 1 · 2 · 3', n: 'Miller scale, read from the facial. Class 3 (horizontal + vertical) is a stage-IV complexity factor.' },
  { f: 'Furcation', g: '1–3 / tooth', r: '0 · I · II · III · IV', n: 'Glickman class, Nabers probe. Maxillary molars: buccal, mesiopalatal, distopalatal. Mandibular molars: buccal, lingual. Maxillary first premolars: mesial, distal.' },
  { f: 'Recession class', g: '1 / tooth', r: 'Miller I–IV · Cairo RT1–3', n: 'Classifies the defect for root-coverage prognosis; Cairo grades it by interproximal attachment loss rather than by the MGJ.' },
  { f: 'Tooth status', g: '1 / tooth', r: 'present · missing · implant', n: 'Missing teeth drop out of every index; implants are probed but diagnosed separately (peri-implant mucositis vs peri-implantitis).' },
  { f: 'Restoration flag', g: '1 / tooth', r: 'crown · pontic', n: 'Crown margins displace the CEJ reference; pontics carry no probing sites at all.' },
  { f: 'Tooth note', g: '1 / tooth', r: 'free text', n: 'Fracture, mucogingival defect, endo-perio lesion, open contact — anything that changes the plan but has no numeric field.' },
]

const EXAM_FIELDS: Field[] = [
  { f: 'Exam metadata', g: '1 / exam', r: 'date · provider · probe · sequence', n: 'Required to compare against prior exams and to support the insurance narrative.' },
  { f: 'Indices', g: '1 / exam', r: 'computed', n: 'Mean PD, mean CAL, BOP %, PI %, and site counts ≥ 4 / ≥ 5 / ≥ 6 mm — the figures that show change over time.' },
  { f: 'AAP 2017 diagnosis', g: '1 / exam', r: 'Stage I–IV · Grade A–C · extent', n: 'Stage from severity + complexity, grade from the bone-loss/age ratio with smoking and HbA1c, extent from the share of involved sites (under 30 % = localized).' },
]

const ASPECT_NOTE =
  'Each aspect is drawn from its own anatomy: anterior crowns converge lingually and carry a cingulum, a maxillary premolar\u2019s palatal cusp is shorter than its buccal one, a mandibular first premolar\u2019s lingual cusp is barely functional, mandibular molars are taller on the lingual, and a mandibular first molar shows three cusps buccally against two lingually. The facial surface is convex and the lingual is hollow, so they take opposite lighting \u2014 highlight in the middle on the facial, marginal ridges lit and the fossa shaded on the lingual.'

const Group = ({ title, rows }: { title: string; rows: Field[] }) => (
  <>
    <tr className="grp"><td colSpan={4}>{title}</td></tr>
    {rows.map((r) => (
      <tr key={r.f}>
        <td className="f">{r.f}</td>
        <td className="r">{r.g}</td>
        <td className="r">{r.r}</td>
        <td className="n">{r.n}</td>
      </tr>
    ))}
  </>
)

export function DataDictionary() {
  return (
    <section className="card ref">
      <div className="card-h">
        <h3>Recorded data set — US six-point periodontal exam</h3>
        <span className="eyebrow">every field a complete chart must capture</span>
      </div>
      <div className="card-b refwrap">
        <table className="spec">
          <thead>
            <tr><th>Field</th><th>Granularity</th><th>Range / values</th><th>Convention &amp; why it is recorded</th></tr>
          </thead>
          <tbody>
            <Group title="Per site — six per tooth (MB · B · DB / ML · L · DL)" rows={SITE_FIELDS} />
            <Group title="Per tooth" rows={TOOTH_FIELDS} />
            <Group title="Per exam" rows={EXAM_FIELDS} />
          </tbody>
        </table>
        <p className="note">{ASPECT_NOTE}</p>
        <p className="note">
          * MGJ is charted on maxillary facial and on mandibular facial and lingual surfaces — there is no maxillary
          palatal mucogingival junction to measure.
        </p>
      </div>
    </section>
  )
}
