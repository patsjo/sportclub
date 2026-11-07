import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Spin } from 'antd';
import { observer } from 'mobx-react';
import { CSSProperties, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { SpinnerDiv } from '../styled/styled';
import { CupBannerScene } from './CupArt';
import {
  CupAdminBar,
  CupCaption,
  CupContent,
  CupGrid,
  CupHero,
  CupPanel,
  CupSection,
  CupStamp,
  CupThemeScope,
  cupThemeVariables
} from './CupStyled';
import { cupHeadingFont, getCupTheme } from './cupThemes';
import { useCups } from './useCup';

const CupEditModal = lazy(() => import('./admin/CupEditModal'));

/** A cup as a comic book cover, in the colors of its own theme */
const Cover = styled(Link)`
  &&& {
    position: relative;
    display: block;
    aspect-ratio: 3 / 4;
    max-height: 460px;
    overflow: hidden;
    container-type: inline-size;
    color: var(--cup-hero-text);
    background: var(--cup-sky1);
    border: 3px solid var(--cup-ink);
    box-shadow: 9px 9px 0 var(--cup-highlight);
    transition:
      transform 0.12s,
      box-shadow 0.12s;
  }
  &&&:hover {
    transform: translate(-3px, -3px);
    box-shadow: 13px 13px 0 var(--cup-highlight);
  }
  .cup-cover-art {
    position: absolute;
    inset: 0;
  }
  .cup-cover-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, var(--cup-sky0) 0%, transparent 45%, rgba(0, 0, 0, 0.55) 100%);
  }
  .cup-cover-text {
    position: absolute;
    inset: 0;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cup-cover-title {
    font-family: ${cupHeadingFont};
    /* Scaled to the cover, so the name is never broken in the middle of a word */
    font-size: min(54px, calc((100cqw - 40px) / (var(--cup-cover-longest, 8) * 0.6)));
    line-height: 0.9;
    text-transform: uppercase;
    -webkit-text-stroke: 2px var(--cup-ink);
    paint-order: stroke fill;
    text-shadow:
      4px 4px 0 var(--cup-ink),
      7px 7px 0 var(--cup-highlight);
    overflow-wrap: normal;
    word-break: keep-all;
  }
`;

/** All cups of the club */
const CupList = observer(() => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const navigate = useNavigate();
  const isAdmin = sessionModel.loggedIn && sessionModel.isAdmin;
  const { cups } = useCups(isAdmin);
  const [searchParams, setSearchParams] = useSearchParams();
  // /cups?new=1 from the menu opens the dialog for a new cup directly
  const creating = isAdmin && searchParams.get('new') === '1';
  const setCreating = (value: boolean) => setSearchParams(value ? { new: '1' } : {}, { replace: true });
  const pageTheme = getCupTheme('NIGHT', null, null);

  return (
    <CupThemeScope theme={pageTheme}>
      <CupHero
        theme={pageTheme}
        kicker={clubModel.title}
        title={t('cup.Cups')}
        stats={cups ? [{ value: cups.length, label: t('cup.Cups') }] : undefined}
      />
      <CupContent>
        {isAdmin ? (
          <CupAdminBar>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              {t('cup.NewCup')}
            </Button>
          </CupAdminBar>
        ) : null}
        <CupSection title={t('cup.AllCups')} />
        {!cups ? (
          <SpinnerDiv>
            <Spin size="large" />
          </SpinnerDiv>
        ) : cups.length === 0 ? (
          <CupPanel>
            <Empty description={t('cup.NoCups')} />
          </CupPanel>
        ) : (
          <CupGrid $min={280}>
            {cups.map(cup => {
              const theme = getCupTheme(cup.theme, cup.primaryColor, cup.secondaryColor);
              return (
                <Cover key={cup.cupId} to={`/cup/${cup.slug}`} style={cupThemeVariables(theme)}>
                  <div className="cup-cover-art">
                    <CupBannerScene theme={theme} crop={[760, 760]} />
                  </div>
                  <div className="cup-cover-shade" />
                  <div className="cup-cover-text">
                    <div>
                      <CupCaption>{t(`cup.Theme${cup.theme}`)}</CupCaption>
                    </div>
                    <div>
                      {!cup.isActive ? (
                        <div style={{ marginBottom: 10 }}>
                          <CupStamp $color="#ffffff">{t('cup.Inactive')}</CupStamp>
                        </div>
                      ) : null}
                      <div
                        className="cup-cover-title"
                        style={
                          {
                            '--cup-cover-longest': Math.max(4, ...cup.name.split(/\s+/).map(word => word.length))
                          } as CSSProperties
                        }
                      >
                        {cup.name}
                      </div>
                    </div>
                  </div>
                </Cover>
              );
            })}
          </CupGrid>
        )}
      </CupContent>
      <Suspense fallback={null}>
        {creating ? (
          <CupEditModal open onClose={() => setCreating(false)} onSaved={cup => navigate(`/cup/${cup.slug}`)} />
        ) : null}
      </Suspense>
    </CupThemeScope>
  );
});

export default CupList;
