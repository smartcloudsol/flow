import { arDict } from "./ar";
import { deDict } from "./de";
import { enDict } from "./en";
import { esDict } from "./es";
import { frDict } from "./fr";
import { heDict } from "./he";
import { hiDict } from "./hi";
import { huDict } from "./hu";
import { idDict } from "./id";
import { itDict } from "./it";
import { jaDict } from "./ja";
import { koDict } from "./ko";
import { nbDict } from "./nb";
import { nlDict } from "./nl";
import { plDict } from "./pl";
import { ptDict } from "./pt";
import { ruDict } from "./ru";
import { svDict } from "./sv";
import { thDict } from "./th";
import { trDict } from "./tr";
import { uaDict } from "./ua";
import { zhDict } from "./zh";

export const operationsTranslations: Record<string, Record<string, string>> = {
  ar: { ...enDict, ...arDict },
  de: { ...enDict, ...deDict },
  en: enDict,
  es: { ...enDict, ...esDict },
  fr: { ...enDict, ...frDict },
  he: { ...enDict, ...heDict },
  hi: { ...enDict, ...hiDict },
  hu: { ...enDict, ...huDict },
  id: { ...enDict, ...idDict },
  it: { ...enDict, ...itDict },
  ja: { ...enDict, ...jaDict },
  ko: { ...enDict, ...koDict },
  nb: { ...enDict, ...nbDict },
  nl: { ...enDict, ...nlDict },
  pl: { ...enDict, ...plDict },
  pt: { ...enDict, ...ptDict },
  ru: { ...enDict, ...ruDict },
  sv: { ...enDict, ...svDict },
  th: { ...enDict, ...thDict },
  tr: { ...enDict, ...trDict },
  ua: { ...enDict, ...uaDict },
  zh: { ...enDict, ...zhDict },
};

export {
  arDict,
  deDict,
  enDict,
  esDict,
  frDict,
  heDict,
  hiDict,
  huDict,
  idDict,
  itDict,
  jaDict,
  koDict,
  nbDict,
  nlDict,
  plDict,
  ptDict,
  ruDict,
  svDict,
  thDict,
  trDict,
  uaDict,
  zhDict,
};
