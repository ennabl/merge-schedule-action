import moment from "moment-timezone";

export function localeDate(): moment.Moment {
  return moment().tz(process.env.INPUT_TIME_ZONE);
}

export function localeDateString(date: string): moment.Moment {
  return moment.tz(date, process.env.INPUT_TIME_ZONE);
}
