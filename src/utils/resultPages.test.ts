import { CreateBookmarkletDialog } from './bookmarkletDialog';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ExternalResultsToResultList,
  IResultsBookmarkletReaders,
  IResultsBookmarkletTexts,
  MergeResultPages,
  ParseEventorResultPage,
  ParseEventorResultsClipboard,
  ParsePastedResults,
  ParseResultDate,
  ParseSportIdentPage,
  ParseTulospalveluPage,
  ResultsBookmarklet,
  ResultsBookmarkletMain
} from './resultPages';
import { ToExternalResultList } from './resultSources';

dayjs.extend(utc);

const page = (list: string, body: string) => `<html><body><div id="main">
<h2>Products and services</h2>
<div class="${list}">
<h2>Official results for European Youth Ski Orienteering Championships 2025 - Long</h2>
<p class="toolbar16 printHidden"><a href="/Events/Show/8554">Event information</a></p>
<p>
Name: Long<br />
Organiser:
<span class="ol_InlineIcon"><img alt="" src="/Organisation/Logotype/182?type=InlineIcon" title="" />Finland</span><br />
Date: 23 March 2025
</p>
${body}
</div></div></body></html>`;

// IOF Eventor (https://eventor.orienteering.sport/Events/ResultList?eventId=8554&groupBy=EventClass), shortened
const individualPage = page(
  'individualResultList',
  `<a id="c16659"></a><div class="eventClassHeader"><div><h3>Men 17</h3>12 100 m, 33 starting competitors</div></div>        <table class="resultList fullWidth manualStriped manualSortable">
<thead>
<tr>
<th class="p">Plac</th><th class="n">Name</th><th class="o">Organisation</th><th class="t">Time</th><th class="d">Diff</th><th class="k">Km time</th>                </tr>
</thead>
<tbody>
<tr class="" data-resultId="1187430">
<td class="p">1</td><td class="n"><a id="p45866" href="/Athletes/Details/45866">Niklas Hirvilahti</a></td><td class="o"><span class="ol_InlineIcon"><img alt="" src="/Organisation/Logotype/0?type=InlineIcon" title="" />Finland</span></td><td class="t">41:05</td><td class="d"></td><td class="k">3:24</td></tr>
<tr class="odd" data-resultId="1187442">
<td class="p">13</td><td class="n"><a id="p52901" href="/Athletes/Details/52901">Arturs&nbsp;Janis Krastins</a></td><td class="o"><span class="ol_InlineIcon"><img alt="" src="/Organisation/Logotype/0?type=InlineIcon" title="" />Latvia</span></td><td class="t">1:00:51</td><td class="d">+19:46</td><td class="k">5:02</td></tr>
<tr class="odd" data-resultId="1187494">
<td class="p"></td><td class="n"><a id="p52888" href="/Athletes/Details/52888">Ville Elgesjo</a></td><td class="o"><span class="ol_InlineIcon"><img alt="" src="/Organisation/Logotype/0?type=InlineIcon" title="" />Sweden</span></td><td class="t">did not start</td><td class="d"></td><td class="k"></td></tr>
</tbody>
</table>`
);

const teamRow = (place: string, clubId: number, club: string, team: number, time: string) =>
  `<tr class="">
<td class="p">${place}</td><td class="n"><a href="/Events/ResultList?eventId=51036&amp;organisationId=${clubId}">${club}</a> ${team}</td><td></td><td class="p"></td><td></td><td class="t">${time}</td><td></td><td></td><td class="d"></td><td></td>                    </tr>`;
const memberRow = (name: string, legTime: string, legPlace: string, time: string, place: string) =>
  `<tr class="teamMember">
<td class="p"></td><td class="n">${name}</td><td class="lt">${legTime}</td><td class="lp">${legPlace}</td><td class="ld"></td><td class="t">${time}</td><td class="op">${place}</td><td class="opd"></td><td class="d"></td><td class="dd"></td>                                </tr>`;
const relayHeader = `<a id="c604294"></a><div class="eventClassHeader"><div><h3>D21</h3>59 starting competitors</div></div><table class="resultList fullWidth manualStriped">
<thead>
<tr>
<th class="p">Plac</th><th class="n">Name</th><th class="lp">Leg time</th><th class="lp">Leg pl</th><th class="lp">Leg diff</th><th class="t">Time</th><th class="lp">Co plac</th><th></th><th class="d">Diff</th><th></th>                </tr>
</thead>
<tbody>`;

// SM, stafett 2024 (https://eventor.orientering.se/Events/ResultList?eventId=51036&groupBy=EventClass), shortened
const relayPage = page(
  'relayResultList',
  `${relayHeader}
${teamRow('1', 2919, 'IFK Göteborg Orientering', 1, '2:23:34')}
${memberRow('1. Malin Agervig Kristiansson', '45:56', '1', '45:56', '1')}
${memberRow('2. Elin Svantesson', '49:03', '4', '1:34:59', '1')}
${memberRow('3. Sanna Fasth', '48:35', '8', '2:23:34', '1')}
${teamRow('2', 585, 'J&#228;rla Orientering', 1, '2:24:07')}
${memberRow('1. Ausrine Kutkaite', '49:02', '7', '49:02', '7')}
${memberRow('2. Elsa Jansson', 'mispunch', '', 'mispunch', '')}
${memberRow('3. Karolin Ohlsson', '44:40', '2', '', '')}
${teamRow('', 87, 'OK Nolaskogsarna', 1, 'did not start')}
${memberRow('1. vacant', '', '', '', '')}
</tbody></table>`
);

const relayPageWithoutLineups = page(
  'relayResultList',
  `${relayHeader}
${teamRow('1', 2919, 'IFK Göteborg Orientering', 1, '2:23:34')}
${teamRow('2', 585, 'J&#228;rla Orientering', 1, '2:24:07')}
</tbody></table>`
);

describe('ParseEventorResultPage', () => {
  it('reads the race and the runners of an individual list', () => {
    const result = ParseEventorResultPage(individualPage);
    expect(result).toMatchObject({
      kind: 'individual',
      eventName: 'European Youth Ski Orienteering Championships 2025 - Long',
      dateText: '23 March 2025',
      organiser: 'Finland',
      missingLineups: false
    });
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('Men 17');
    expect(result.classes[0].lengthInMeter).toBe(12100);
    expect(result.classes[0].persons).toEqual([
      { given: 'Niklas', family: 'Hirvilahti', club: 'Finland', place: 1, time: 2465, status: 'OK' },
      // The parts of a given name are joined by a no-break space
      { given: 'Arturs Janis', family: 'Krastins', club: 'Latvia', place: 13, time: 3651, status: 'OK' },
      { given: 'Ville', family: 'Elgesjo', club: 'Sweden', place: null, time: null, status: 'DidNotStart' }
    ]);
  });

  it('reads the teams and their runners of a relay list', () => {
    const result = ParseEventorResultPage(relayPage);
    expect(result.kind).toBe('relay');
    const teams = result.classes[0].teams;
    expect(teams.map(team => [team.name, team.clubs, team.place, team.time, team.status])).toEqual([
      ['IFK Göteborg Orientering 1', ['IFK Göteborg Orientering'], 1, 8614, 'OK'],
      ['Järla Orientering 1', ['Järla Orientering'], 2, 8647, 'OK'],
      ['OK Nolaskogsarna 1', ['OK Nolaskogsarna'], null, null, 'DidNotStart']
    ]);
    expect(teams[0].members[0]).toEqual({
      leg: 1,
      given: 'Malin',
      family: 'Agervig Kristiansson',
      legTime: 2756,
      legPlace: 1,
      totalTime: 2756,
      totalPlace: 1,
      status: 'OK'
    });
    expect(teams[0].members.map(m => [m.leg, m.legPlace, m.totalTime])).toEqual([
      [1, 1, 2756],
      [2, 4, 5699],
      [3, 8, 8614]
    ]);
    expect(teams[1].members[1]).toMatchObject({ leg: 2, legTime: null, legPlace: null, status: 'MissingPunch' });
    // A vacant leg is no runner
    expect(teams[2].members).toEqual([]);
  });

  it('tells a relay list without the runners of the teams, and a page without results', () => {
    expect(ParseEventorResultPage(relayPageWithoutLineups).missingLineups).toBe(true);
    expect(ParseEventorResultPage('<html><body><h2>Event calendar</h2></body></html>').kind).toBe('other');
  });
});

// tulospalvelu.fi as the browser shows it, shortened
const tulospalveluPage = (heading: string, className: string, subHeading: string, head: string[], rows: string) =>
  `<html><body><div id="online_content"><h1 id="OnlineHeaderUpper">${heading}</h1><div id="OnlineHeaderLower"><h2 class="ClassNameTitle HideIfEmbedded">${className}</h2><div id="HeaderNavigation"><a href="/tulokset-new/en/2024_sprint/">&lt; Classes</a> - <a href="/tulokset-new/en/2024_sprint/w80a/standings/1/0/">Finish 1,3 km</a></div><h3>${subHeading}</h3></div><div id="OnlineTable_wrapper"><table id="OnlineTable" class="MainView display nowrap compact dataTable"><thead><tr>${head
    .map(
      title =>
        `<th class="ui-state-default"><span class="dt-column-title">${title}</span><span class="dt-column-order"></span></th>`
    )
    .join('')}</tr></thead><tbody>${rows}</tbody></table></div></div></body></html>`;
const flag = '<td><img src="https://cdn.tulospalvelu.fi/tulokset/kuvat/svg/FIN.svg" class="flag" alt="FIN"></td>';

const wmocStandings = tulospalveluPage(
  'WMOC Sprint Final, 4.8.2024',
  'M75A',
  'Finish 1,9 km',
  ['Pl', 'Bib', 'Name', '', 'Club', 'Result', 'Diff'],
  `<tr><td class="numbercell dt-type-numeric">1</td><td class="numbercell dt-type-numeric">3039</td><td><a href="?Popup=Competitor;3039;1">Peter Gorvett</a></td>${flag}<td><a href="?Popup=ClubResults;CADOC;1">CADOC</a></td><td class="timecell">13:01</td><td class="timecell"></td></tr>
<tr><td class="numbercell dt-type-numeric">2</td><td class="numbercell dt-type-numeric">1745</td><td><a href="?Popup=Competitor;1745;1">Kari Sane</a></td>${flag}<td><a href="?Popup=ClubResults;Helsingin%20Suunnistajat;1">Helsingin Suunnistajat</a></td><td class="timecell">13:29</td><td class="timecell">+28</td></tr>
<tr><td class="numbercell dt-type-numeric"></td><td class="numbercell dt-type-numeric">3254</td><td><a href="?Popup=Competitor;3254;1">Yngve Karlsson</a></td>${flag}<td><a href="?Popup=ClubResults;IFK%20Mora%20OK;1">IFK Mora OK</a></td><td class="timecell">Did not start</td><td class="timecell"></td></tr>`
);

const splitCell = (time: string, rank: number, leg: string) =>
  `<td class="timecell"><span><u>${time} <span class="rank">(${rank})</span></u></span><br><span title="+2">${leg} <span class="rank">(3)</span></span></td>`;
const wmocSplits = tulospalveluPage(
  'WMOC Sprint Final, 4.8.2024',
  'W80A',
  'Split times',
  ['Pl', 'Name - Club', '', 'S-1', '1-2', '2-F', 'Result', 'Diff'],
  `<tr><td class="numbercell SplitsRankWithSelection dt-type-numeric"><span class="Selected"></span>1</td><td class="sticky"><a href="?Popup=Competitor;2442;1">Torid Kvaal<span class="Bib"> (2442)</span></a><br><a href="?Popup=ClubResults;Freidig;1">Freidig</a></td>${flag}${splitCell('57', 1, '57')}${splitCell('1:28', 1, '31')}${splitCell('12:16', 1, '34')}<td class="timecell">12:16</td><td class="timecell"></td></tr>`
);

const jukolaHead = (legColumn: string | undefined) =>
  legColumn
    ? ['Pl', 'Nr', 'Lag', '', 'Namn', 'Resultat', 'Skillnad', legColumn]
    : ['Pl', 'Nr', 'Namn', 'Resultat', 'Skillnad', 'Lag', ''];
const team = (bib: number, name: string) => `<td><a href="?Popup=Competitor;${bib}">${name}</a></td><td>FIN</td>`;
const cells = (...values: string[]) => values.map(value => `<td class="timecell">${value}</td>`).join('');
// The standings after leg 6 and 7 (the finish), and the leg times of leg 7
const jukolaAfterLeg6 = tulospalveluPage(
  'Nuorten Jukola 2026',
  'Nuorten Jukola',
  '6. V&#228;xling 4,6 km',
  jukolaHead('6. etapp'),
  `<tr><td class="numbercell">1</td><td class="numbercell">9</td>${team(9, 'Angelniemen Ankkuri')}<td>Aino Virtanen</td>${cells('2:40:40', '', '30:00')}</tr>
<tr><td class="numbercell">2</td><td class="numbercell">6</td>${team(6, 'Lahden Suunnistajat-37')}<td>Ella Marttinen</td>${cells('2:40:58', '+18', '31:00')}</tr>
<tr><td class="numbercell">3</td><td class="numbercell">80</td>${team(80, 'Hyvink&#228;&#228;n Rasti 2')}<td>Olli Kallio</td>${cells('2:50:00', '+9:20', '33:00')}</tr>`
);
const jukolaFinish = tulospalveluPage(
  'Nuorten Jukola 2026',
  'Nuorten Jukola',
  'M&#229;l 6,1 km',
  jukolaHead('7. etapp'),
  `<tr><td class="numbercell">1</td><td class="numbercell">6</td>${team(6, 'Lahden Suunnistajat-37')}<td>Aatu Marttinen</td>${cells('3:15:03', '', '34:05')}</tr>
<tr><td class="numbercell">2</td><td class="numbercell">9</td>${team(9, 'Angelniemen Ankkuri')}<td>Onni Virtanen</td>${cells('3:15:38', '+35', '34:58')}</tr>
<tr><td class="numbercell"></td><td class="numbercell">80</td>${team(80, 'Hyvink&#228;&#228;n Rasti 2')}<td>Olli H&#228;tinen</td>${cells('disk', '', '')}</tr>`
);
const jukolaLegTimes = tulospalveluPage(
  'Nuorten Jukola 2026',
  'Nuorten Jukola',
  'Etapptider 7. etapp 6,1 km',
  jukolaHead(undefined),
  `<tr><td class="numbercell">1</td><td class="numbercell">28</td><td>Topi Hyyti&#228;inen</td>${cells('33:20', '')}${team(28, 'Kangasala SK')}</tr>
<tr><td class="numbercell">2</td><td class="numbercell">6</td><td>Aatu Marttinen</td>${cells('34:05', '+45')}${team(6, 'Lahden Suunnistajat-37')}</tr>`
);
const jukolaUrl = (view: string) => `https://online.tulospalvelu.fi/tulokset-new/sv/nj2026_nj/nj/${view}`;
// The legs without a length are empty, null when the results were kept as JSON
const legLengths = (lengths: Record<number, number>) =>
  Array.from({ length: 7 }, (_, index) => lengths[index + 1] ?? null);
const lengthsOf = (values: unknown[] | undefined) => Array.from(values ?? [], value => value ?? null);

describe('ParseTulospalveluPage', () => {
  it('reads the results of a class', () => {
    const page = ParseTulospalveluPage(
      wmocStandings,
      'https://online.tulospalvelu.fi/tulokset-new/en/2024_sprint/m75a/standings/1/0/'
    );
    expect(page).toMatchObject({ kind: 'individual', eventName: 'WMOC Sprint Final', dateText: '4.8.2024' });
    expect(page.classes[0]).toMatchObject({ name: 'M75A', lengthInMeter: 1900 });
    expect(page.classes[0].persons).toEqual([
      { given: 'Peter', family: 'Gorvett', club: 'CADOC', place: 1, time: 781, status: 'OK' },
      { given: 'Kari', family: 'Sane', club: 'Helsingin Suunnistajat', place: 2, time: 809, status: 'OK' },
      { given: 'Yngve', family: 'Karlsson', club: 'IFK Mora OK', place: null, time: null, status: 'DidNotStart' }
    ]);
  });

  it('reads the split times, the controls by their number', () => {
    const page = ParseTulospalveluPage(
      wmocSplits,
      'https://online.tulospalvelu.fi/tulokset-new/en/2024_sprint/w80a/splits/1/'
    );
    expect(page.classes[0]).toMatchObject({ name: 'W80A', lengthInMeter: 1300 });
    expect(page.classes[0].persons[0]).toEqual({
      given: 'Torid',
      family: 'Kvaal',
      club: 'Freidig',
      place: 1,
      time: 736,
      status: 'OK',
      splits: [
        { code: '1', time: 57 },
        { code: '2', time: 88 }
      ]
    });
  });

  it('reads the standings of a relay after a leg, and the leg times', () => {
    const finish = ParseTulospalveluPage(jukolaFinish, jukolaUrl('stallning/7/0/'));
    expect(finish.kind).toBe('relay');
    expect(lengthsOf(finish.classes[0].legLengths)).toEqual(legLengths({ 7: 6100 }));
    expect(finish.classes[0].teams[0]).toEqual({
      name: 'Lahden Suunnistajat-37',
      bib: '6',
      clubs: ['Lahden Suunnistajat-37'],
      place: 1,
      time: 11703,
      status: 'OK',
      afterLeg: 7,
      members: [
        {
          leg: 7,
          given: 'Aatu',
          family: 'Marttinen',
          legTime: 2045,
          legPlace: null,
          totalTime: 11703,
          totalPlace: 1,
          status: 'OK'
        }
      ]
    });
    expect(finish.classes[0].teams[2]).toMatchObject({
      name: 'Hyvinkään Rasti 2',
      clubs: ['Hyvinkään Rasti'],
      status: 'Disqualified'
    });
    const legTimes = ParseTulospalveluPage(jukolaLegTimes, jukolaUrl('etapptider/7/'));
    expect(legTimes.classes[0].teams[1].members[0]).toMatchObject({
      leg: 7,
      legTime: 2045,
      legPlace: 2,
      totalTime: null
    });
  });

  it('reads the standings after the first leg, the leg time is the time of the team', () => {
    // After the first leg the standings have no column of the leg time
    const html = tulospalveluPage(
      'Kotka-Jukola 2026, Jukolan Viesti',
      'Jukolan Viesti',
      '1. V&#228;xling 13,0 km',
      ['Pl', 'Nr', 'Lag', 'Nat', 'Namn', 'Resultat', 'Skillnad'],
      `<tr><td class="numbercell">1</td><td class="numbercell">68</td>${team(68, 'Tullinge SK')}<td>Simon Imark</td>${cells('1:19:31', '')}</tr>
<tr><td class="numbercell">30</td><td class="numbercell">29</td>${team(29, 'OK Orion')}<td>Tim Johansson</td>${cells('1:22:05', '+2:34')}</tr>`
    );
    const page = ParseTulospalveluPage(html, 'https://results.jukola.fi/tulokset-new/sv/j2026_ju/ju/stallning/1/0/');
    expect(page.classes[0].name).toBe('Jukolan Viesti');
    expect(lengthsOf(page.classes[0].legLengths)).toEqual([13000]);
    expect(page.classes[0].teams[1]).toMatchObject({ name: 'OK Orion', place: 30, time: 4925, afterLeg: 1 });
    expect(page.classes[0].teams[1].members[0]).toEqual({
      leg: 1,
      given: 'Tim',
      family: 'Johansson',
      legTime: 4925,
      legPlace: null,
      totalTime: 4925,
      totalPlace: 30,
      status: 'OK'
    });
  });

  it('does not take a page without the class or without results, e.g. the start list', () => {
    const withoutClass = jukolaFinish.replace(/<h2[^>]*>[^<]*<\/h2>/, '');
    expect(ParseTulospalveluPage(withoutClass, jukolaUrl('stallning/7/0/')).kind).toBe('other');
    const startList = tulospalveluPage(
      'Nuorten Jukola 2026',
      'Nuorten Jukola',
      'Startlista',
      ['Nr', 'Lag', '', 'Namn'],
      ''
    );
    expect(ParseTulospalveluPage(startList, jukolaUrl('competitors/p1/')).kind).toBe('other');
  });

  it('does not take a standing at a control of the course, or a page without results', () => {
    expect(ParseTulospalveluPage(jukolaFinish, jukolaUrl('stallning/7/2/')).kind).toBe('other');
    expect(ParseTulospalveluPage('<html><body><div id="online_content"></div></body></html>', jukolaUrl('')).kind).toBe(
      'other'
    );
  });
});

describe('MergeResultPages', () => {
  const external = (html: string, url: string) => ({ url, ...ParseTulospalveluPage(html, url) });

  it('joins the legs of the teams by their number, the team result is after the last leg', () => {
    let collected = MergeResultPages(undefined, external(jukolaFinish, jukolaUrl('stallning/7/0/')));
    collected = MergeResultPages(collected, external(jukolaAfterLeg6, jukolaUrl('stallning/6/0/')));
    collected = MergeResultPages(collected, external(jukolaLegTimes, jukolaUrl('etapptider/7/')));
    const classResult = collected.classes[0];
    expect(lengthsOf(classResult.legLengths)).toEqual(legLengths({ 6: 4600, 7: 6100 }));
    expect(classResult.teams.map(t => [t.name, t.place, t.time, t.status, t.members.map(m => m.leg)])).toEqual([
      ['Lahden Suunnistajat-37', 1, 11703, 'OK', [6, 7]],
      ['Angelniemen Ankkuri', 2, 11738, 'OK', [6, 7]],
      ['Hyvinkään Rasti 2', null, null, 'Disqualified', [6, 7]],
      ['Kangasala SK', null, null, 'OK', [7]]
    ]);
    // The leg place of the leg times, the time and place of the team after the leg of the standings
    expect(classResult.teams[0].members[1]).toMatchObject({
      legTime: 2045,
      legPlace: 2,
      totalTime: 11703,
      totalPlace: 1
    });
  });

  it('is an IOF XML relay with the course of every leg, and the leg places from the leg times', () => {
    let collected = MergeResultPages(undefined, external(jukolaAfterLeg6, jukolaUrl('stallning/6/0/')));
    collected = MergeResultPages(collected, external(jukolaFinish, jukolaUrl('stallning/7/0/')));
    const list = ToExternalResultList(ExternalResultsToResultList(collected));
    const classResult = list.ClassResult![0];
    expect(lengthsOf(classResult.Course?.map(c => c.Length))).toEqual(legLengths({ 6: 4600, 7: 6100 }));
    const lahti = classResult.TeamResult!.find(t => t.Name === 'Lahden Suunnistajat-37')!;
    expect(lahti.TeamMemberResult!.map(m => [m.Result![0].Leg, m.Result![0].Time, m.Result![0].Position])).toEqual([
      [6, 1860, 2],
      [7, 2045, 1]
    ]);
    expect(lahti.TeamMemberResult![1].Result![0].OverallResult).toEqual({ Time: 11703, Position: 1, Status: 'OK' });
  });
});

// SPORTident Center as the browser shows it, shortened
const sportIdentTitle = (className: string) =>
  `<tracks-event-title><div class="title-container"><div class="title-title"> Swiss O Days Heidiland - E2 - Pizol </div><div class="title-class-choice"><mat-select><div class="mat-select-trigger"><span class="mat-select-value-text"><mat-select-trigger><div class="class-wrapper"><span class="class-name">${className}</span><span class="class-spacer"></span><span class="class-description in-trigger">22 controls / 89 athletes</span></div></mat-select-trigger></span></div></mat-select></div></div></tracks-event-title>`;
const sportIdentSplit = (leg: string, total: string) =>
  `<td class="split-times-column ng-star-inserted"><div class="font-weight-bold"><span class="time">${leg}</span><span class="position">(1)</span></div><div class="text-muted"><span class="time behind-time">&nbsp;</span><span class="position"></span></div><div class="font-weight-bold"><span class="time">${total}</span><span class="position">(1)</span></div><div class="text-muted"><span class="time cumulative-behind-time">&nbsp;</span><span class="position"></span></div></td>`;
const sportIdentAthlete = (given: string, family: string, club: string) =>
  `<td class="participant-column clickable primary" title="${given} ${family} (1997)"><div class="wide-column"><div class="name truncate"> ${given} ${family} (1997) </div><div class="club-yob truncate"> ${club} </div></div><div class="short-column"><div class="firstname truncate"> ${given} </div><div class="lastname truncate"> ${family} </div><div class="yob"> (1997) </div><div class="club truncate"> ${club} </div></div></td>`;
const sportIdentAnalysis = `<html><body><tracks-root>${sportIdentTitle('A')}<table class="table"><thead><th class="position-column">Pos</th><th class="participant-column"> Athlete </th><th class="cumulative-time-column"><div>Time</div><div class="small"> Time behind </div></th><th class="split-times-column ng-star-inserted"> 1 (111) </th><th class="split-times-column ng-star-inserted"> 2 (118) </th><th class="split-times-column ng-star-inserted"> Finish </th><th class="athlete-details-link"> Details </th></thead><tbody>
<tr class="split-times-table-row ng-star-inserted"><td class="position-column primary"><div class="check-box clickable checked-true"> 1 </div></td>${sportIdentAthlete('Simon', 'Hector', 'Sn&#228;ttringe SK')}<td class="cumulative-time-column"><div><span>43:45</span></div></td>${sportIdentSplit('2:13', '2:13')}${sportIdentSplit('1:02', '3:15')}${sportIdentSplit('0:20', '43:45')}<td></td></tr>
<tr class="split-times-table-row ng-star-inserted"><td class="position-column"><div class="check-box no-position"> - </div></td>${sportIdentAthlete('Timon', 'Aegler', 'OL Regio Wil')}<td class="cumulative-time-column"><span class="ng-star-inserted">MP</span></td>${sportIdentSplit('4:08', '4:08')}<td class="split-times-column"><div><span class="time">MP</span><span class="position"></span></div></td><td class="split-times-column"><div><span class="time">MP</span></div></td><td></td></tr>
</tbody></table></tracks-root></body></html>`;
const sportIdentOverview = `<html><body><tracks-root><tracks-overview><div class="event-details"><div class="event-name truncate">Swiss O Days Heidiland - E1 - Spitzmeilen</div><div class="event-date truncate"> July 12, 2025  </div></div><ul class="class-list"><li class="card-classlist clickable active"><span class="row1 truncate"> A (64/66) </span></li></ul><tracks-event-class-result-list><div class="result-list-container"><ul><li class="card-class-information clickable"><span class="row1 truncate"> A (64/66) </span></li><li class="card-resultlist card-resultlist-header"><span class="header-position">Pos</span><span class="header-athlete">Athlete</span></li><li class="card-resultlist clickable gold"><span class="participant-position circle-background gold-text">1</span><span class="participant-name truncate">Simon Hector (1997) </span><span class="participant-club truncate">Sn&#228;ttringe SK</span><span class="participant-time">1:02:39</span><span class="participant-behindTime"></span></li><li class="card-resultlist clickable"><span class="participant-position circle-background">-</span><span class="participant-name truncate">Siff Haagen Sals&#248; (1997) </span><span class="participant-club truncate">Aarhus 1900 Orientering</span><span class="participant-time">MP</span></li></ul></div></tracks-event-class-result-list></tracks-overview></tracks-root></body></html>`;

describe('ParseSportIdentPage', () => {
  it('reads the analysis of a class, with the split times by the codes of the controls', () => {
    const page = ParseSportIdentPage(sportIdentAnalysis);
    expect(page).toMatchObject({ kind: 'individual', eventName: 'Swiss O Days Heidiland - E2 - Pizol' });
    expect(page.classes[0].name).toBe('A');
    expect(page.classes[0].persons).toEqual([
      {
        given: 'Simon',
        family: 'Hector',
        club: 'Snättringe SK',
        place: 1,
        time: 2625,
        status: 'OK',
        splits: [
          { code: '111', time: 133 },
          { code: '118', time: 195 }
        ]
      },
      {
        given: 'Timon',
        family: 'Aegler',
        club: 'OL Regio Wil',
        place: null,
        time: null,
        status: 'MissingPunch',
        splits: [{ code: '111', time: 248 }]
      }
    ]);
  });

  it('reads the result list of the overview, with the date', () => {
    const page = ParseSportIdentPage(sportIdentOverview);
    expect(page).toMatchObject({ eventName: 'Swiss O Days Heidiland - E1 - Spitzmeilen', dateText: 'July 12, 2025' });
    expect(page.classes[0].name).toBe('A');
    expect(page.classes[0].persons).toEqual([
      { given: 'Simon', family: 'Hector', club: 'Snättringe SK', place: 1, time: 3759, status: 'OK' },
      {
        given: 'Siff',
        family: 'Haagen Salsø',
        club: 'Aarhus 1900 Orientering',
        place: null,
        time: null,
        status: 'MissingPunch'
      }
    ]);
  });

  it('has split times in the IOF XML for the missing time', () => {
    const list = ToExternalResultList(
      ExternalResultsToResultList({
        url: 'https://center.sportident.com/x',
        ...ParseSportIdentPage(sportIdentAnalysis)
      })
    );
    expect(list.ClassResult![0].PersonResult![0].Result![0].SplitTime).toEqual([
      { ControlCode: '111', Time: 133 },
      { ControlCode: '118', Time: 195 }
    ]);
  });
});

describe('ParseResultDate', () => {
  it('reads the date of the page', () => {
    expect(ParseResultDate('23 March 2025')).toBe('2025-03-23');
    expect(ParseResultDate('Sunday 8 September 2024')).toBe('2024-09-08');
    expect(ParseResultDate('lördag 12 oktober 2024')).toBe('2024-10-12');
    expect(ParseResultDate('July 12, 2025')).toBe('2025-07-12');
    expect(ParseResultDate('4.8.2024')).toBe('2024-08-04');
    expect(ParseResultDate('2026-09-27')).toBe('2026-09-27');
    expect(ParseResultDate('soon')).toBeUndefined();
  });
});

describe('ExternalResultsToResultList', () => {
  const external = (html: string) => ({ url: 'https://eventor.orienteering.sport/x', ...ParseEventorResultPage(html) });

  it('is an IOF XML result list of one race, as the import of Eventor takes it', () => {
    const list = ToExternalResultList(ExternalResultsToResultList(external(individualPage)));
    expect(list.Event.Name).toBe('European Youth Ski Orienteering Championships 2025 - Long');
    expect(list.Event.Classification).toBe('International');
    expect(list.Event.Race?.[0]).toMatchObject({ RaceNumber: 1, StartTime: { Date: '2025-03-23' } });
    const classResult = list.ClassResult![0];
    expect(classResult.Course?.[0].Length).toBe(12100);
    const results = classResult.PersonResult!.map(p => [p.Person.Name.Given, p.Organisation?.Name, p.Result?.[0]]);
    expect(results[0]).toEqual([
      'Niklas',
      'Finland',
      { Time: 2465, Position: 1, Status: 'OK', TimeBehind: 0, '@attributes': { raceNumber: 1 } }
    ]);
    expect(results[2]).toEqual(['Ville', 'Sweden', { Status: 'DidNotStart', '@attributes': { raceNumber: 1 } }]);
  });

  it('has the team result on the last leg of a relay', () => {
    const list = ToExternalResultList(ExternalResultsToResultList(external(relayPage)));
    expect(list.Event.Form).toEqual(['Relay']);
    const team = list.ClassResult![0].TeamResult![0];
    expect(team.Organisation).toEqual([{ Name: 'IFK Göteborg Orientering' }]);
    const legs = team.TeamMemberResult!.map(m => m.Result![0]);
    expect(legs.map(r => [r.Leg, r.Time, r.Position, r.OverallResult?.Time, r.OverallResult?.Position])).toEqual([
      [1, 2756, 1, 2756, 1],
      [2, 2943, 4, 5699, 1],
      [3, 2915, 8, 8614, 1]
    ]);
    expect(legs.every(r => r.BibNumber === '1-1')).toBe(true);
  });
});

const texts: IResultsBookmarkletTexts = {
  title: 'Copy results',
  wrongPage: 'wrong page',
  fetching: 'fetching',
  failed: 'failed: {message}',
  ready: '{classes} classes, {results} results',
  collected: 'collected: {names}',
  notKept: 'not kept',
  closeAndContinue: 'Close and continue copying',
  copiedTitle: 'Copied!',
  copied: 'copied',
  copyManually: 'copy manually',
  close: 'Close'
};
const readers: IResultsBookmarkletReaders = {
  eventor: ParseEventorResultPage,
  tulospalvelu: ParseTulospalveluPage,
  sportident: ParseSportIdentPage,
  merge: MergeResultPages
};

describe('ResultsBookmarklet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is a javascript link that compiles', () => {
    const link = ResultsBookmarklet(texts);
    expect(link.startsWith('javascript:')).toBe(true);
    expect(() => new Function(decodeURIComponent(link.substring('javascript:'.length)))).not.toThrow();
  });

  const clipboard = () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    return writeText;
  };
  const loadPage = (html: string) => {
    document.documentElement.innerHTML = new DOMParser().parseFromString(html, 'text/html').documentElement.innerHTML;
  };
  const box = () => document.getElementById('sportclub-results');

  it('copies the results of the page', async () => {
    const writeText = clipboard();
    loadPage(individualPage);
    ResultsBookmarkletMain(readers, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const results = ParseEventorResultsClipboard(writeText.mock.calls[0][0]);
    expect(results?.eventName).toBe('European Youth Ski Orienteering Championships 2025 - Long');
    expect(results?.classes[0].persons.map(p => p.family)).toEqual(['Hirvilahti', 'Krastins', 'Elgesjo']);
    await vi.waitFor(() => expect(box()?.textContent).toContain('copied'));
    // It tells that it is copied, the only button closes it
    expect(box()?.textContent).toContain('Copied!');
    expect(Array.from(box()!.querySelectorAll('button')).map(b => b.textContent)).toEqual(['Close']);
  });

  it('fetches the runners of the teams when the relay list does not show them', async () => {
    const writeText = clipboard();
    const fetchMock = vi.fn(async (url: string) => ({
      url,
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => relayPage
    }));
    vi.stubGlobal('fetch', fetchMock);
    loadPage(relayPageWithoutLineups);
    ResultsBookmarkletMain(readers, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('showRelayLineups=True');
    const results = ParseEventorResultsClipboard(writeText.mock.calls[0][0]);
    expect(results?.classes[0].teams[0].members).toHaveLength(3);
  });

  it('collects the legs of tulospalvelu, "Close" leaves the copy and starts from nothing at the next click', async () => {
    localStorage.clear();
    const writeText = clipboard();
    const visit = async (html: string, view: string) => {
      const url = new URL(jukolaUrl(view));
      vi.stubGlobal('location', { href: url.href, hostname: url.hostname, pathname: url.pathname });
      loadPage(html);
      ResultsBookmarkletMain(readers, texts, CreateBookmarkletDialog);
      await vi.waitFor(() => expect(box()?.textContent).toContain('Copied!'));
      return ParseEventorResultsClipboard(writeText.mock.calls[writeText.mock.calls.length - 1][0]);
    };
    const buttons = () => Array.from(box()!.querySelectorAll('button'));

    await visit(jukolaAfterLeg6, 'stallning/6/0/');
    expect(buttons().map(b => b.textContent)).toEqual(['Close and continue copying', 'Close']);
    // Continues, the next leg is added to it
    buttons()[0].click();
    const both = await visit(jukolaFinish, 'stallning/7/0/');
    expect(both?.classes[0].teams[0].members.map(m => m.leg)).toEqual([6, 7]);
    // "Close" keeps the copy, but the next click starts from nothing
    buttons()[1].click();
    const next = await visit(jukolaFinish, 'stallning/7/0/');
    expect(next?.classes[0].teams[0].members.map(m => m.leg)).toEqual([7]);
  });

  it('tells when the page has no result list', async () => {
    const writeText = clipboard();
    loadPage('<html><body><h2>Event calendar</h2></body></html>');
    ResultsBookmarkletMain(readers, texts, CreateBookmarkletDialog);
    await vi.waitFor(() => expect(box()?.textContent).toContain('wrong page'));
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('ParsePastedResults', () => {
  it('takes the results of the bookmarklet and an IOF XML result list, nothing else', () => {
    const xml = `BOM<?xml version="1.0" encoding="utf-8"?>
<ResultList xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0">
<Event><Name>5 Days of Italy - Gara 1</Name><StartTime><Date>2026-07-06</Date></StartTime></Event>
<ClassResult><Class><Id>ME</Id><Name>M 21 Elite</Name></Class>
<PersonResult><Person><Id></Id><Name><Family>Attinger</Family><Given>Florian</Given></Name></Person>
<Result><Time>5200</Time><Position>1</Position><Status>OK</Status></Result></PersonResult></ClassResult>
</ResultList>`.replace('BOM', String.fromCharCode(0xfeff));
    expect(ParsePastedResults(xml)?.ClassResult?.[0].PersonResult?.[0].Result?.[0]).toMatchObject({
      Time: 5200,
      Position: 1
    });
    const json = JSON.stringify({ sportclubResults: 1, url: '', ...ParseSportIdentPage(sportIdentOverview) });
    expect(ParsePastedResults(json)?.Event.Name).toBe('Swiss O Days Heidiland - E1 - Spitzmeilen');
    expect(ParsePastedResults('<html></html>')).toBeUndefined();
    expect(ParsePastedResults('{"sverigelistan":1,"classes":[]}')).toBeUndefined();
  });
});

describe('ParseEventorResultsClipboard', () => {
  it('takes only the results of the bookmarklet', () => {
    expect(ParseEventorResultsClipboard('{"sverigelistan":1,"classes":[]}')).toBeUndefined();
    expect(ParseEventorResultsClipboard('not json')).toBeUndefined();
    expect(
      ParseEventorResultsClipboard(
        '{"sportclubResults":1,"eventName":"X","classes":[{"name":"H21","persons":[{"given":"A","family":"B","status":"bad","time":"1"}]}]}'
      )?.classes[0].persons[0]
    ).toEqual({ given: 'A', family: 'B', club: '', place: null, time: null, status: 'DidNotFinish' });
  });
});
