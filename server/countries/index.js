/**
 * Every country the service knows, by ISO 3166-1 alpha-2 code.
 *
 * A country module exports an object with:
 *
 *   id, locale, dateFormat
 *   place(r)                 a city record: where somebody lives or was born
 *   birthPlace(r, birth)     optional: when not every place existed at every birth
 *   name(r, gender)          first, last, middle, full — and latin or kana
 *                            where the country writes in another script
 *   address(r, place)        the parts, `lines` as an envelope has them and
 *                            `line` as a form's single field wants it
 *   phone(r, place)          national, international, e164
 *   documents(r, person)     [{ id, name, kind, value, raw?, details? }]
 *   bank(r, person)          optional: { name?, fields: [...] }
 *   cards | card(r, person)  the networks a card is drawn from, or a function
 *   company(r, person)       optional: { name, documents: [...] }
 *
 * Document names are the country's own — ИНН, NIR, Codice fiscale — and are
 * never translated: a tester looking for the field labelled СНИЛС needs to see
 * СНИЛС. What kind of document it is gets translated instead.
 */

import br from './br.js';
import cn from './cn.js';
import de from './de.js';
import es from './es.js';
import fr from './fr.js';
import gb from './gb.js';
import india from './in.js';
import it from './it.js';
import jp from './jp.js';
import kz from './kz.js';
import mx from './mx.js';
import nl from './nl.js';
import pl from './pl.js';
import pt from './pt.js';
import ru from './ru.js';
import sa from './sa.js';
import tr from './tr.js';
import ua from './ua.js';
import us from './us.js';

const ALL = [br, cn, de, es, fr, gb, india, it, jp, kz, mx, nl, pl, pt, ru, sa, tr, ua, us];

export const COUNTRIES = Object.fromEntries(ALL.map(country => [country.id, country]));
export const COUNTRY_IDS = ALL.map(country => country.id).sort();
