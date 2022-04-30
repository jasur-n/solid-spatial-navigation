import { createEffect, createSignal, onMount } from 'solid-js';
import { styled } from 'solid-styled-components';

import {
  useFocusable,
  init,
  FocusContext,
} from './spatial-navigation';

init({
  debug: false,
});

const rows = [
  {
    title: 'Recommended',
  },
  {
    title: 'Movies',
  },
  {
    title: 'Series',
  },
  {
    title: 'TV Channels',
  },
  {
    title: 'Sport',
  },
];

const assets = [
  {
    title: 'Asset 1',
    color: '#714ADD',
  },
  {
    title: 'Asset 2',
    color: '#AB8DFF',
  },
  {
    title: 'Asset 3',
    color: '#512EB0',
  },
  {
    title: 'Asset 4',
    color: '#714ADD',
  },
  {
    title: 'Asset 5',
    color: '#AB8DFF',
  },
  {
    title: 'Asset 6',
    color: '#512EB0',
  },
  {
    title: 'Asset 7',
    color: '#714ADD',
  },
  {
    title: 'Asset 8',
    color: '#AB8DFF',
  },
  {
    title: 'Asset 9',
    color: '#512EB0',
  },
];

const MenuItemBox = styled.div`
  width: 171px;
  height: 51px;
  background-color: #b056ed;
  border-color: white;
  border-style: solid;
  border-width: ${({ focused }) => (focused ? '6px' : 0)};
  box-sizing: border-box;
  border-radius: 7px;
  margin-bottom: 37px;
`;

function MenuItem() {
  const { ref, focused } = useFocusable();

  return <MenuItemBox ref={ref} focused={focused()} />;
}

const MenuWrapper = styled.div`
  flex: 1;
  max-width: 246px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${({ hasFocusedChild }) =>
    hasFocusedChild ? '#4e4181' : '#362C56'};
  padding-top: 37px;
`;

function Menu({ focusKey: focusKeyParam }) {
  const {
    ref,
    focusSelf,
    hasFocusedChild,
    focusKey,
    focused,
    // setFocus, -- to set focus manually to some focusKey
    // navigateByDirection, -- to manually navigate by direction
    // pause, -- to pause all navigation events
    // resume, -- to resume all navigation events
    // updateAllLayouts -- to force update all layouts when needed
  } = useFocusable({
    focusable: true,
    saveLastFocusedChild: false,
    trackChildren: true,
    autoRestoreFocus: true,
    isFocusBoundary: false,
    focusKey: focusKeyParam,
    preferredChildFocusKey: null,
    onEnterPress: () => {},
    onEnterRelease: () => {},
    onArrowPress: () => true,
    onFocus: () => {},
    onBlur: () => {},
    extraProps: { foo: 'bar' },
  });

  onMount(focusSelf);

  return (
    <FocusContext.Provider value={focusKey()}>
      <MenuWrapper ref={ref} hasFocusedChild={hasFocusedChild()}>
        <MenuItem />
        <MenuItem />
        <MenuItem />
        <MenuItem />
        <MenuItem />
      </MenuWrapper>
    </FocusContext.Provider>
  );
}

const AssetWrapper = styled.div`
  margin-right: 22px;
  display: flex;
  flex-direction: column;
`;

const AssetBox = styled.div`
  width: 225px;
  height: 127px;
  background-color: ${({ color }) => color};
  border-color: white;
  border-style: solid;
  border-width: ${({ focused }) => (focused ? '6px' : 0)};
  box-sizing: border-box;
  border-radius: 7px;
`;

const AssetTitle = styled.div`
  color: white;
  margin-top: 10px;
  font-family: 'Segoe UI';
  font-size: 24px;
  font-weight: 400;
`;

function Asset({ title, color, onEnterPress, onFocus }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
    extraProps: {
      title,
      color,
    },
  });

  return (
    <AssetWrapper ref={ref}>
      <AssetBox color={color} focused={focused()} />
      <AssetTitle>{title}</AssetTitle>
    </AssetWrapper>
  );
}

const ContentRowWrapper = styled.div`
  margin-bottom: 37px;
`;

const ContentRowTitle = styled.div`
  color: white;
  margin-bottom: 22px;
  font-size: 27px;
  font-weight: 700;
  font-family: 'Segoe UI';
  padding-left: 60px;
`;

const ContentRowScrollingWrapper = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 1;
  flex-grow: 1;
  padding-left: 60px;
`;

const ContentRowScrollingContent = styled.div`
  display: flex;
  flex-direction: row;
`;

function ContentRow({ title: rowTitle, onAssetPress, onFocus }) {
  const { ref, focusKey } = useFocusable({
    onFocus,
  });

  let scrollingRef;

  const onAssetFocus = ({ x }) => {
    scrollingRef.scrollTo({
      left: x,
      behavior: 'smooth',
    });
  };

  return (
    <FocusContext.Provider value={focusKey()}>
      <ContentRowWrapper ref={ref}>
        <ContentRowTitle>{rowTitle}</ContentRowTitle>
        <ContentRowScrollingWrapper ref={scrollingRef}>
          <ContentRowScrollingContent>
            {assets.map(({ title, color }) => (
              <Asset
                key={title}
                title={title}
                color={color}
                onEnterPress={onAssetPress}
                onFocus={onAssetFocus}
              />
            ))}
          </ContentRowScrollingContent>
        </ContentRowScrollingWrapper>
      </ContentRowWrapper>
    </FocusContext.Provider>
  );
}

const ContentWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ContentTitle = styled.div`
  color: white;
  font-size: 48px;
  font-weight: 600;
  font-family: 'Segoe UI';
  text-align: center;
  margin-top: 52px;
  margin-bottom: 37px;
`;

const SelectedItemWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SelectedItemBox = styled.div`
  height: 282px;
  width: 1074px;
  background-color: ${({ color }) => color};
  margin-bottom: 37px;
  border-radius: 7px;
`;

const SelectedItemTitle = styled.div`
  position: absolute;
  bottom: 75px;
  left: 100px;
  color: white;
  font-size: 27px;
  font-weight: 400;
  font-family: 'Segoe UI';
`;

const ScrollingRows = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 1;
  flex-grow: 1;
`;

function Content() {
  const { ref, focusKey } = useFocusable();

  const [selectedAsset, setSelectedAsset] = createSignal(null);

  const onAssetPress = (asset) => {
    setSelectedAsset(asset);
  };

  const onRowFocus = ({ y }) => {
    ref().scrollTo({
      top: y,
      behavior: 'smooth',
    });
  };

  return (
    <FocusContext.Provider value={focusKey()}>
      <ContentWrapper>
        <ContentTitle>Norigin Spatial Navigation</ContentTitle>
        <SelectedItemWrapper>
          <SelectedItemBox
            color={selectedAsset() ? selectedAsset().color : '#565b6b'}
          />
          <SelectedItemTitle>
            {selectedAsset()
              ? selectedAsset().title
              : 'Press "Enter" to select an asset'}
          </SelectedItemTitle>
        </SelectedItemWrapper>
        <ScrollingRows ref={ref}>
          <div>
            {rows.map(({ title }) => (
              <ContentRow
                key={title}
                title={title}
                onAssetPress={onAssetPress}
                onFocus={onRowFocus}
              />
            ))}
          </div>
        </ScrollingRows>
      </ContentWrapper>
    </FocusContext.Provider>
  );
}

const AppContainer = styled.div`
  background-color: #221c35;
  width: 1440px;
  height: 810px;
  display: flex;
  flex-direction: row;
`;

export default function App() {
  return (
    <AppContainer>
      <Menu focusKey="MENU" />
      <Content />
    </AppContainer>
  );
}
