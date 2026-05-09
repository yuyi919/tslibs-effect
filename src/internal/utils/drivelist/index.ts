import { ExecException, ExecFileException } from "node:child_process";
import { platform } from "node:os";
import { DriveDataInterface } from "./types.js";

let execDriveList: (
  cb: (
    err: ExecException | ExecFileException | null,
    driveList: DriveDataInterface[]
  ) => any
) => any;

if (platform() === "win32") {
  execDriveList = (cb) => import("./win32.js").then((f) => f.execDriveList(cb));
} else {
  execDriveList = (cb) => import("./posix.js").then((f) => f.execDriveList(cb));
}

export const getDriveList = (): Promise<DriveDataInterface[]> => {
  return new Promise((resolve) => {
    execDriveList(
      (
        err: ExecException | ExecFileException | null,
        driveList: DriveDataInterface[]
      ) => resolve(driveList)
    );
  });
};

export async function getDriveByName(
  driveName: string
): Promise<DriveDataInterface | null> {
  const driveList = (await getDriveList()) as DriveDataInterface[];

  for (const drive of driveList) {
    if (drive.name === driveName) {
      return drive;
    }
  }

  return null;
}
