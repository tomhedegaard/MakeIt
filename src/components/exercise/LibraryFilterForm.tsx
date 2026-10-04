"use client";

import Form from "next/form";
import { useState } from "react";

type Option = { value: string; label: string };

/**
 * Search and equipment filter for the exercise library. A GET form, so
 * the state lives in the URL and it works without JavaScript; with
 * JavaScript, next/form navigates on the client and the equipment
 * choice submits on change.
 *
 * The fields are controlled so they can follow the URL when a category
 * pill or the reset link changes the filters. Remounting the form with
 * a key would do the same, but it drops keyboard focus after every
 * search.
 */
export default function LibraryFilterForm({
  q,
  category,
  equipment,
  equipmentOptions,
  labels,
}: {
  q: string;
  category: string;
  equipment: string;
  equipmentOptions: Option[];
  labels: { search: string; placeholder: string; equipment: string; allEquipment: string; submit: string };
}) {
  const [applied, setApplied] = useState({ q, equipment });
  const [text, setText] = useState(q);
  const [chosen, setChosen] = useState(equipment);
  // The URL changed under the form: take its values (state adjusted during render, no effect needed).
  if (applied.q !== q || applied.equipment !== equipment) {
    setApplied({ q, equipment });
    setText(q);
    setChosen(equipment);
  }

  return (
    <Form action="/train/exercises" role="search" className="flex flex-wrap items-end gap-3">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <label className="min-w-0 flex-1 basis-56 space-y-1.5">
        <span className="block text-micro text-fg-dim">{labels.search}</span>
        <input
          type="search"
          name="q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={labels.placeholder}
          maxLength={80}
          autoComplete="off"
          className="input w-full"
        />
      </label>
      <label className="min-w-0 grow basis-44 space-y-1.5 sm:grow-0">
        <span className="block text-micro text-fg-dim">{labels.equipment}</span>
        <select
          name="equipment"
          value={chosen}
          onChange={(e) => {
            setChosen(e.target.value);
            // The element already holds the new value, so the submit carries it.
            e.currentTarget.form?.requestSubmit();
          }}
          className="input w-full"
        >
          <option value="">{labels.allEquipment}</option>
          {equipmentOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-primary">
        {labels.submit}
      </button>
    </Form>
  );
}
