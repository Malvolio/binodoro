import { Panel } from "./Panel";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Effect, Option } from "effect";
import { Save, Shuffle, Pencil, Trash2, RotateCcw } from "lucide-react";
import { defaults, type Preset, type Settings } from "../../shared/src/model";
import { PresetId, PresetName } from "../../shared/src/schema";
import { Button } from "./components/ui/button";
const nameForm = FormReact.make(
  FormBuilder.empty.addField("name", PresetName),
  {
    fields: {
      name: ({ field }) => (
        <label className="select-label" htmlFor="preset-name">
          Preset name
          <input
            id="preset-name"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            maxLength={80}
          />
          {Option.isSome(field.error) && (
            <span role="alert" className="fine">
              Enter a name between 1 and 80 characters.
            </span>
          )}
        </label>
      ),
    },
    onSubmit: (args: { save: (name: string) => void }, { decoded }) =>
      Effect.sync(() => args.save(decoded.name)),
  },
);
const LibraryActions = ({
  settings,
  custom,
  preset,
  persist,
  select,
  apply,
  randomize,
}: {
  settings: Settings;
  custom: Preset[];
  preset: string;
  persist: (p: Preset[]) => void;
  select: (id: string) => void;
  apply: (s: Settings) => void;
  randomize: () => void;
}) => {
  const submit = useAtomSet(nameForm.submit),
    values = useAtomValue(nameForm.values),
    name = Option.isSome(values) ? values.value.name.trim() : "";
  const selected = custom.find((p) => p.id === preset);
  return (
    <>
      <nameForm.name />
      <div className="library-actions">
        <Button
          variant="outline"
          disabled={!name}
          onClick={() =>
            submit({
              save: (name: string) => {
                const p = {
                  id: PresetId.make(crypto.randomUUID()),
                  name: name.trim(),
                  settings: { ...settings },
                };
                persist([...custom, p]);
                select(p.id);
              },
            })
          }
        >
          <Save size={14} /> Save preset
        </Button>
        <Button variant="outline" onClick={randomize}>
          <Shuffle size={14} /> Randomize
        </Button>
      </div>
      {selected && (
        <div className="library-actions">
          <Button
            variant="ghost"
            disabled={!name}
            onClick={() =>
              submit({
                save: (name: string) =>
                  persist(
                    custom.map((p) =>
                      p.id === preset ? { ...p, name: name.trim() } : p,
                    ),
                  ),
              })
            }
          >
            <Pencil size={13} /> Rename
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              persist(custom.filter((p) => p.id !== preset));
              select("");
            }}
          >
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          persist([]);
          apply(defaults);
          select("default-2");
        }}
      >
        <RotateCcw size={13} /> Restore defaults
      </Button>
    </>
  );
};
export const PresetLibrary = (props: Parameters<typeof LibraryActions>[0]) => (
  <Panel
    className="panel preset-panel"
    label="Saved sounds"
    heading={<h2>Saved sounds</h2>}
    accessory={
      <>
        <Save size={15} />
      </>
    }
  >
    <nameForm.Initialize defaultValues={{ name: "My focus sound" }}>
      <LibraryActions {...props} />
    </nameForm.Initialize>
  </Panel>
);
