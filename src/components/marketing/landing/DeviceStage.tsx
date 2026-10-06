import { DEVICE_SOON } from "@/lib/marketing/landing/devices";

/**
 * The chosen watch's sync card beside the app's HRV screen (HRV
 * chapter): what HQ reads from it and when it last synced, or that it is
 * coming. One card per device, stacked; globals.css shows the card
 * matching the section's `data-device` (HeartLive sets it), slides it in
 * and runs a sync dot across to the phone. Decorative: the device
 * buttons carry the choice and the sync line says the same in words.
 */
export default function DeviceStage({
  devices,
  reads,
  syncedAt,
  soon,
}: {
  devices: readonly string[];
  reads: string;
  syncedAt: string;
  soon: string;
}) {
  return (
    <div aria-hidden="true" className="device-stage relative grid w-[clamp(180px,15vw,210px)] flex-none">
      {devices.map((name, i) => (
        <div key={name} data-device-i={i} className="device-slot device-only [grid-area:1/1] border border-line bg-bg-2 p-4">
          <p className="font-display text-[clamp(24px,2.2vw,30px)] leading-none">{name}</p>
          {DEVICE_SOON[i] ? (
            <p className="mt-4 text-[13px] text-fg-dim">{soon}</p>
          ) : (
            <>
              <p className="mt-4 text-[13px]">{reads}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-dim">
                <i className="size-1.5 rounded-full bg-domain" />
                {syncedAt}
              </p>
              <span className="device-sync" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
