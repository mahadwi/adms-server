export enum DeviceCommandType {
  // device
  CHECK = 'check',
  RESET = 'reset',
  RELOAD = 'reload',
  INFO = 'info',
  LOG = 'log',
  REBOOT = 'reboot',
  // settings
  SET_TIMEZONE = 'set.timezone',
  SET_LANGUAGE = 'set.language',
  SET_VOLUME = 'set.volume',
  // user management
  USER_INFO = 'user.info',
  USER_EDIT = 'user.edit',
  USER_DELETE = 'user.delete',
  USER_CLONE = 'user.clone',
  USER_MOVE = 'user.move',
  // attendance
  ATTENDANCE_DOWNLOAD = 'attendance.download',
  ATTENDANCE_VERIFY = 'attendance.verify',
  ATTENDANCE_CLEAR = 'attendance.clear',
  // command system
  SHELL = 'command.system',
}
