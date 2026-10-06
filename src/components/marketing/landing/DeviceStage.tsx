import Image from "next/image";
import { DEVICE_PHOTOS } from "@/lib/marketing/landing/devices";

/**
 * The chosen watch beside the app's HRV screen (HRV chapter). One slot
 * per device, stacked; globals.css shows the slot matching the section's
 * `data-device` (HeartLive sets it), slides it in and runs a sync dot
 * across to the phone. A device without an approved photo shows its
 * name. Decorative: the device buttons carry the choice and the sync
 * line names the device in words.
 */
export default function DeviceStage({ devices }: { devices: readonly string[] }) {
  return (
    <div aria-hidden="true" className="device-stage relative grid size-[clamp(140px,14vw,190px)] flex-none">
      {devices.map((name, i) => {
        const photo = DEVICE_PHOTOS[i];
        return (
          <div key={name} data-device-i={i} className="device-slot device-only [grid-area:1/1] grid place-items-center border border-line">
            {photo ? (
              <Image src={photo.src} alt="" width={photo.width} height={photo.height} className="h-[80%] w-auto object-contain" />
            ) : (
              <span className="font-display px-3 text-center text-[clamp(22px,2.2vw,30px)] leading-none text-fg-dim">{name}</span>
            )}
            <span className="device-sync" />
          </div>
        );
      })}
    </div>
  );
}
