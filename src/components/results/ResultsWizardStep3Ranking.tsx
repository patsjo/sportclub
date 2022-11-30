import { Alert, Col, Form, InputNumber, Row } from 'antd';
import { FormInstance } from 'antd/lib/form';
import InputTime from 'components/formItems/InputTime';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobxStore } from 'utils/mobxStore';
import { useResultWizardStore } from 'utils/resultWizardStore';
import { errorRequiredField, FormSelect } from '../../utils/formHelper';
import { lightConditions } from '../../utils/resultConstants';
import FormItem from '../formItems/FormItem';

const areaResultOptions = [
  { timePerKilometer: '00:03:45.000', description: 'Sprint' },
  { timePerKilometer: '00:04:30.000', description: 'Snabblöpt flack tallskog (Åhus)' },
  { timePerKilometer: '00:04:45.000', description: 'Snabblöpt tallskog (Kalmar)' },
  { timePerKilometer: '00:05:00.000', description: 'Östkust terräng (Oskarshamn)' },
  { timePerKilometer: '00:05:15.000', description: 'Inlandet (Blekinge, Småland, Närke, Värmland, Dalarna, Fjäll)' },
  { timePerKilometer: '00:05:30.000', description: 'Kuperad inlandsterräng (Jönköping, Örebro)' },
  { timePerKilometer: '00:05:45.000', description: 'Lite tuffare terräng' },
  { timePerKilometer: '00:06:00.000', description: 'Kuperad och tuff terräng' },
].map((option) => ({ code: JSON.stringify(option), description: `${option.timePerKilometer}, ${option.description}` }));

const areaNightResultOptions = [
  { timePerKilometer: '00:03:45.000', description: 'Natt - sprint' },
  { timePerKilometer: '00:04:45.000', description: 'Natt - Snabblöpt flack tallskog (Åhus)' },
  { timePerKilometer: '00:05:15.000', description: 'Natt - Snabblöpt tallskog (Kalmar)' },
  { timePerKilometer: '00:05:30.000', description: 'Natt - Östkust terräng (Oskarshamn)' },
  {
    timePerKilometer: '00:05:45.000',
    description: 'Natt - Inlandet (Blekinge, Småland, Närke, Värmland, Dalarna, Fjäll)',
  },
  { timePerKilometer: '00:06:00.000', description: 'Natt - Kuperad inlandsterräng (Jönköping, Örebro)' },
  { timePerKilometer: '00:06:15.000', description: 'Natt - Lite tuffare terräng' },
  { timePerKilometer: '00:06:30.000', description: 'Natt - Kuperad och tuff terräng' },
].map((option) => ({ code: JSON.stringify(option), description: `${option.timePerKilometer}, ${option.description}` }));

interface IResultWizardStep3RankingProps {
  saving: boolean;
  onValidate: (valid: boolean) => void;
}
const ResultWizardStep3Ranking = observer(({ saving, onValidate }: IResultWizardStep3RankingProps) => {
  const { t } = useTranslation();
  const { clubModel, sessionModel } = useMobxStore();
  const { raceWizardModel } = useResultWizardStore();
  const formRef = useRef<FormInstance>(null);
  const formId = useMemo(() => 'resultsWizardFormStep3Ranking' + Math.floor(Math.random() * 1000000000000000), []);

  useEffect(() => {
    if (
      raceWizardModel.raceEvent &&
      raceWizardModel.raceEvent.rankingBasetimePerKilometer != null &&
      raceWizardModel.raceEvent.rankingBasepoint != null &&
      raceWizardModel.raceEvent.rankingBaseDescription != null
    ) {
      onValidate(true);
    } else if (raceWizardModel.raceEvent && clubModel.raceClubs) {
      if (['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode)) {
        raceWizardModel.raceEvent.setStringValueOrNull('rankingBasetimePerKilometer', undefined);
        raceWizardModel.raceEvent.setNumberValueOrNull('rankingBasepoint', undefined);
        if (!raceWizardModel.existInEventor) {
          raceWizardModel.raceEvent.setStringValueOrNull('rankingBaseDescription', raceWizardModel.raceEvent.sportCode);
        } else {
          raceWizardModel.raceEvent.setStringValueOrNull('rankingBaseDescription', undefined);
        }
      } else {
        let timePerKilometer = '00:03:00.000';
        const description = clubModel.raceClubs.sportOptions.find(
          (option) => option.code === raceWizardModel.raceEvent?.sportCode
        )?.description;

        if (raceWizardModel.raceEvent.sportCode === 'RUN') {
          timePerKilometer = '00:02:50.000';
        } else if (raceWizardModel.raceEvent.sportCode === 'SKI') {
          timePerKilometer = '00:02:20.000';
        } else if (raceWizardModel.raceEvent.sportCode === 'MTB') {
          timePerKilometer = '00:01:45.000';
        }
        raceWizardModel.raceEvent.setStringValueOrNull('rankingBasetimePerKilometer', timePerKilometer);
        raceWizardModel.raceEvent.setNumberValueOrNull('rankingBasepoint', 0);
        raceWizardModel.raceEvent.setStringValueOrNull('rankingBaseDescription', `${timePerKilometer}, ${description}`);
        onValidate(true);
      }
    }
  }, []);

  return !saving && raceWizardModel.raceEvent ? (
    <Form
      id={formId}
      ref={formRef}
      layout="vertical"
      initialValues={{
        iRankingBasetimePerKilometer: raceWizardModel.raceEvent.rankingBasetimePerKilometer,
        iRankingBasepoint: raceWizardModel.raceEvent.rankingBasepoint,
      }}
    >
      {['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode) ? (
        <>
          {raceWizardModel.raceEvent?.validRanking ? (
            <Alert message={raceWizardModel.raceEvent?.rankingBaseDescription} type="success" showIcon />
          ) : (
            <Alert
              message={
                <>
                  <Row gutter={8}>
                    <Col span={24}>
                      Välj i första hand bästa herrsenioren, och hans ranking på samma tävling enligt sverigelistan.
                    </Col>
                  </Row>
                  <Row gutter={8}>
                    <Col span={24}>Välj i andra hand bästa junior, om denna tillhör sverige eliten.</Col>
                  </Row>
                  <Row gutter={8}>
                    <Col span={24}>Välj i tredje hand hastighet från en terrängtyp.</Col>
                  </Row>
                  <Row gutter={8}>
                    <Col span={24}>
                      OBS! Undvik att välja gubbar, damer eller ungdomar från sverigelistan, då detta blir helt
                      missvisande.
                    </Col>
                  </Row>
                </>
              }
              type="info"
              showIcon
            />
          )}
          <Row gutter={8}>
            {raceWizardModel.existInEventor && !raceWizardModel.raceEvent.isRelay ? (
              <Col span={12}>
                <FormItem name="iWinnerTime" label={t('results.WinnerTime')}>
                  <FormSelect
                    dropdownMatchSelectWidth={false}
                    allowClear={true}
                    options={raceWizardModel.raceWinnerResultOptions}
                    onChange={(code) => {
                      const raceWinnerResult = JSON.parse(code);
                      raceWizardModel.raceEvent?.setStringValueOrNull(
                        'rankingBasetimePerKilometer',
                        raceWinnerResult.timePerKilometer
                      );
                      raceWizardModel.raceEvent?.setNumberValueOrNull('rankingBasepoint', undefined);
                      raceWizardModel.raceEvent?.setStringValueOrNull(
                        'rankingBaseDescription',
                        `${raceWinnerResult.timePerKilometer}, ${raceWinnerResult.className}, ${raceWinnerResult.personName}`
                      );
                      formRef.current?.setFieldsValue({
                        iAreaTime: undefined,
                        iRankingBasetimePerKilometer: raceWinnerResult.timePerKilometer,
                        iRankingBasepoint: undefined,
                      });
                      onValidate(!!raceWizardModel.raceEvent?.validRanking);
                    }}
                  />
                </FormItem>
              </Col>
            ) : null}
            {raceWizardModel.raceEvent.sportCode === 'OL' ? (
              <Col span={12}>
                <FormItem name="iAreaTime" label={t('results.Area')}>
                  <FormSelect
                    dropdownMatchSelectWidth={false}
                    allowClear={true}
                    options={
                      raceWizardModel.raceEvent.raceLightCondition === lightConditions.night
                        ? areaNightResultOptions
                        : areaResultOptions
                    }
                    onChange={(code) => {
                      const areaResult = JSON.parse(code);
                      raceWizardModel.raceEvent?.setStringValueOrNull(
                        'rankingBasetimePerKilometer',
                        areaResult.timePerKilometer
                      );
                      raceWizardModel.raceEvent?.setNumberValueOrNull('rankingBasepoint', 0);
                      raceWizardModel.raceEvent?.setStringValueOrNull(
                        'rankingBaseDescription',
                        `${areaResult.timePerKilometer}, ${areaResult.description}`
                      );
                      formRef.current?.setFieldsValue({
                        iWinnerTime: undefined,
                        iRankingBasetimePerKilometer: areaResult.timePerKilometer,
                        iRankingBasepoint: 0,
                      });
                      onValidate(!!raceWizardModel.raceEvent?.validRanking);
                    }}
                  />
                </FormItem>
              </Col>
            ) : null}
          </Row>
        </>
      ) : null}
      <Row gutter={8}>
        <Col span={6}>
          <FormItem
            name="iRankingBasetimePerKilometer"
            label={t('results.TimePerKilometer')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.TimePerKilometer'),
              },
            ]}
          >
            <InputTime
              format={'mm:ss.SSS'}
              disabled={!['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode)}
              allowClear={false}
              style={{ width: '100%' }}
              onChange={(time) => {
                raceWizardModel.raceEvent?.setStringValueOrNull('rankingBasetimePerKilometer', time);
                onValidate(!!raceWizardModel.raceEvent?.validRanking);
              }}
            />
          </FormItem>
        </Col>
        <Col span={6}>
          <FormItem
            name="iRankingBasepoint"
            label={t('results.Ranking')}
            rules={[
              {
                required: true,
                message: errorRequiredField(t, 'results.Ranking'),
              },
            ]}
          >
            <InputNumber
              disabled={!['OL', 'SKIO', 'MTBO'].includes(raceWizardModel.raceEvent.sportCode)}
              min={-5}
              max={100}
              step={0.01}
              decimalSeparator=","
              style={{ width: '100%' }}
              onChange={(value: number | null) => {
                try {
                  raceWizardModel.raceEvent?.setNumberValueOrNull('rankingBasepoint', value);
                } catch (error) {
                  console.error(error);
                }
                onValidate(!!raceWizardModel.raceEvent?.validRanking);
              }}
            />
          </FormItem>
        </Col>
      </Row>
    </Form>
  ) : null;
});

export default ResultWizardStep3Ranking;
