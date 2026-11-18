import { Steps, StepsProps } from 'antd';
import { useIsMobile } from '../../utils/useIsMobile';

interface IWizardStepsProps {
  current: number;
  items: NonNullable<StepsProps['items']>;
}

/**
 * The steps of a wizard. On a phone a compact row where only the current step has its title,
 * instead of a vertical list that takes a third of the screen.
 */
const WizardSteps = ({ current, items }: IWizardStepsProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <Steps
      size="small"
      responsive={false}
      orientation="horizontal"
      current={current}
      items={items.map((item, index) => ({ ...item, title: index === current ? item.title : undefined }))}
    />
  ) : (
    <Steps current={current} items={items} />
  );
};

export default WizardSteps;
