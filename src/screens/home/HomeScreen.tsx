import React, {useCallback, useEffect, useState, useRef, useLayoutEffect} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import {DrawerActions, useNavigation} from '@react-navigation/native';
import {BottomSheet, BottomSheetBehavior, Box} from 'components';
import {DevSettings, Linking, Animated} from 'react-native';
import {
  ExposureStatusType,
  SystemStatus,
  useExposureStatus,
  useStartExposureNotificationService,
  useSystemStatus,
} from 'services/ExposureNotificationService';
import {Theme} from 'shared/theme';
import {useStorage} from 'services/StorageService';
import {getRegionCase} from 'shared/RegionLogic';
import {usePrevious} from 'shared/usePrevious';

import {useExposureNotificationSystemStatusAutomaticUpdater} from '../../services/ExposureNotificationService';
import {RegionCase} from '../../shared/Region';

import {BluetoothDisabledView} from './views/BluetoothDisabledView';
import {CollapsedOverlayView} from './views/CollapsedOverlayView';
import {DiagnosedShareView} from './views/DiagnosedShareView';
import {DiagnosedView} from './views/DiagnosedView';
import {ExposureNotificationsDisabledView} from './views/ExposureNotificationsDisabledView';
import {ExposureView} from './views/ExposureView';
import {NoExposureUncoveredRegionView} from './views/NoExposureUncoveredRegionView';
import {NoExposureCoveredRegionView} from './views/NoExposureCoveredRegionView';
import {NoExposureNoRegionView} from './views/NoExposureNoRegionView';
import {NetworkDisabledView} from './views/NetworkDisabledView';
import {OverlayView} from './views/OverlayView';
import {FrameworkUnavailableView} from './views/FrameworkUnavailableView';
import {UnknownProblemView} from './views/UnknownProblemView';
import {
  useNotificationPermissionStatus,
  NotificationPermissionStatusProvider,
} from './components/NotificationPermissionStatus';
import {LocationOffView} from './views/LocationOffView';

type BackgroundColor = keyof Theme['colors'];

interface ContentProps {
  setBackgroundColor: (color: string) => void;
  isBottomSheetExpanded: boolean;
}

const strToBackgroundColor = (backgroundColor: string): BackgroundColor => {
  const color: BackgroundColor = backgroundColor as BackgroundColor;
  return color;
};

const Content = ({setBackgroundColor, isBottomSheetExpanded}: ContentProps) => {
  const {region} = useStorage();
  const regionCase = getRegionCase(region);
  const [exposureStatus] = useExposureStatus();
  const [systemStatus] = useSystemStatus();
  const [, turnNotificationsOn] = useNotificationPermissionStatus();
  useEffect(() => {
    return turnNotificationsOn();
  }, [turnNotificationsOn]);

  const network = useNetInfo();
  setBackgroundColor('mainBackground');

  const getNoExposureView = (_regionCase: RegionCase) => {
    switch (_regionCase) {
      case 'noRegionSet':
        return <NoExposureNoRegionView isBottomSheetExpanded={isBottomSheetExpanded} />;
      case 'regionCovered':
        return <NoExposureCoveredRegionView isBottomSheetExpanded={isBottomSheetExpanded} />;
      case 'regionNotCovered':
        return <NoExposureUncoveredRegionView isBottomSheetExpanded={isBottomSheetExpanded} />;
    }
  };

  // this is for the test menu
  const {forceScreen} = useStorage();
  switch (forceScreen) {
    case 'NoExposureView':
      return getNoExposureView(regionCase);
    case 'ExposureView':
      return <ExposureView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case 'DiagnosedShareView':
      return <DiagnosedShareView isBottomSheetExpanded={isBottomSheetExpanded} />;
    default:
      break;
  }

  switch (systemStatus) {
    case SystemStatus.Undefined:
      return null;
    case SystemStatus.BluetoothOff:
      return <BluetoothDisabledView />;
    case SystemStatus.Disabled:
    case SystemStatus.Restricted:
      return <ExposureNotificationsDisabledView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case SystemStatus.PlayServicesNotAvailable:
      return <FrameworkUnavailableView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case SystemStatus.LocationOff:
      return <LocationOffView isBottomSheetExpanded={isBottomSheetExpanded} />;
  }

  if (!network.isConnected) {
    return <NetworkDisabledView />;
  }

  switch (exposureStatus.type) {
    case ExposureStatusType.Exposed:
      return <ExposureView isBottomSheetExpanded={isBottomSheetExpanded} />;
    case ExposureStatusType.Diagnosed:
      return exposureStatus.needsSubmission ? (
        <DiagnosedShareView isBottomSheetExpanded={isBottomSheetExpanded} />
      ) : (
        <DiagnosedView isBottomSheetExpanded={isBottomSheetExpanded} />
      );
    case ExposureStatusType.Monitoring:
    default:
      switch (systemStatus) {
        case SystemStatus.Active:
          return getNoExposureView(regionCase);
        default:
          return <UnknownProblemView isBottomSheetExpanded={isBottomSheetExpanded} />;
      }
  }
};

const CollapsedContent = (bottomSheetBehavior: BottomSheetBehavior) => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';

  // if (systemStatus === SystemStatus.Unknown) {
  //   return null;
  // }

  return (
    <CollapsedOverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOn}
      bottomSheetBehavior={bottomSheetBehavior}
    />
  );
};

const ExpandedContent = (bottomSheetBehavior: BottomSheetBehavior) => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';
  const toSettings = useCallback(() => {
    Linking.openSettings();
  }, []);
  const turnNotificationsOnFn = notificationStatus === 'blocked' ? toSettings : turnNotificationsOn;
  // if (systemStatus === SystemStatus.Unknown) {
  //   return null;
  // }

  return (
    <OverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOnFn}
      bottomSheetBehavior={bottomSheetBehavior}
    />
  );
};

export const HomeScreen = () => {
  const navigation = useNavigation();
  useEffect(() => {
    if (__DEV__) {
      DevSettings.addMenuItem('Show Test Menu', () => {
        navigation.dispatch(DrawerActions.openDrawer());
      });
    }
  }, [navigation]);

  // This only initiate system status updater.
  // The actual updates will be delivered in useSystemStatus().
  const subscribeToStatusUpdates = useExposureNotificationSystemStatusAutomaticUpdater();
  useEffect(() => {
    return subscribeToStatusUpdates();
  }, [subscribeToStatusUpdates]);

  const startExposureNotificationService = useStartExposureNotificationService();
  useEffect(() => {
    startExposureNotificationService();
  }, [startExposureNotificationService]);

  const [backgroundColor, setBackgroundColor] = useState<string>('mainBackground');

  const bottomSheetRef = useRef<BottomSheetBehavior>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const currentStatus = useExposureStatus()[0].type;
  const previousStatus = usePrevious(currentStatus);
  useLayoutEffect(() => {
    if (previousStatus === ExposureStatusType.Monitoring && currentStatus === ExposureStatusType.Diagnosed) {
      bottomSheetRef.current?.collapse();
    }
  }, [currentStatus, previousStatus]);
  useLayoutEffect(() => {
    bottomSheetRef.current?.setOnStateChange(setIsBottomSheetExpanded);
  }, []);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(
    () =>
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: 1000,
        duration: 10,
        useNativeDriver: false,
      }).start(),
    [fadeAnim],
  );

  return (
    <NotificationPermissionStatusProvider>
      <Box flex={1} alignItems="center" backgroundColor={strToBackgroundColor(backgroundColor)}>
        <Box
          flex={1}
          paddingTop="m"
          paddingBottom="m"
          alignSelf="stretch"
          accessibilityElementsHidden={isBottomSheetExpanded}
          importantForAccessibility={isBottomSheetExpanded ? 'no-hide-descendants' : undefined}
        >
          <Animated.View style={{opacity: fadeAnim}}>
            <Content isBottomSheetExpanded={isBottomSheetExpanded} setBackgroundColor={setBackgroundColor} />
          </Animated.View>
        </Box>
        <BottomSheet ref={bottomSheetRef} expandedComponent={ExpandedContent} collapsedComponent={CollapsedContent} />
      </Box>
    </NotificationPermissionStatusProvider>
  );
};
