import YAML from 'yaml';
import fiveServicePathwaysYaml from '../forms/five-service-pathways.yml?raw';
import spiritualGiftsDiscoveryYaml from '../forms/spiritual-gifts-discovery.yml?raw';
import type { AdminAuthority, AssessmentFormDefinition } from './admin.types';

export const ADMIN_HIERARCHY_PATH = 'administration/adminHierarchy';
export const ADMIN_CHIEF_UID_PATH = `${ADMIN_HIERARCHY_PATH}/chiefUid`;
export const ADMIN_USERS_PATH = `${ADMIN_HIERARCHY_PATH}/users`;
export const CAROUSEL_PATH = 'landingPage/carousel';
export const ASSESSMENT_FORMS_CONTROL_PATH = 'assessmentPage/forms';
export const MAX_IMAGE_SIZE_BYTES = 3_000_000;
export const MAX_CAROUSEL_PHOTOS = 12;

export const EMPTY_ADMIN_AUTHORITY: AdminAuthority = {
  manageAssessmentForms: false,
  manageCarousel: false,
  manageAttendance: false,
};

export const FULL_ADMIN_AUTHORITY: AdminAuthority = {
  manageAssessmentForms: true,
  manageCarousel: true,
  manageAttendance: true,
};

export const ASSESSMENT_FORM_DEFINITIONS = [
  fiveServicePathwaysYaml,
  spiritualGiftsDiscoveryYaml,
]
  .map((raw) => YAML.parse(raw) as AssessmentFormDefinition)
  .filter((form) => form.status !== 'disabled');
