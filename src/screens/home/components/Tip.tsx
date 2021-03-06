import React from 'react';
import {Box, ButtonSingleLine, Icon, Text} from 'components';
import {Linking} from 'react-native';
import {useI18n} from 'locale';
import {useStorage} from 'services/StorageService';

export const Tip = () => {
  const i18n = useI18n();
  const {region} = useStorage();
  return (
    <Box backgroundColor="green2" borderRadius={10} paddingVertical="m" marginTop="m" marginBottom="xl">
      <Box flexDirection="row" paddingLeft="s" paddingRight="m">
        <Box flex={0} paddingTop="xxs" marginRight="xxs">
          <Icon name="icon-light-bulb" size={40} />
        </Box>
        <Box flex={1}>
          <Text>
            <Text fontWeight="bold">{i18n.translate('Home.DiagnosedView.Tip.Title')}</Text>
            <Text>{i18n.translate(`Home.DiagnosedView.Tip.${region}.Body`)}</Text>
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal="m" paddingTop="s">
        <ButtonSingleLine
          text={i18n.translate(`Home.DiagnosedView.Tip.${region}.CTA`)}
          variant="thinFlatNeutralGrey"
          externalLink
          onPress={() => Linking.openURL(i18n.translate(`Home.DiagnosedView.Tip.${region}.URL`))}
        />
      </Box>
    </Box>
  );
};
