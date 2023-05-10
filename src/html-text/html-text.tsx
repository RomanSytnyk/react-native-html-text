import React from 'react';
import { TextProps, Linking, Text, TextStyle } from 'react-native';
import { parse, NodeType } from 'node-html-parser';
import { decode } from 'he';
import { toRN } from '../helpers/transform';

import { HtmlTextContext } from './html-text-context';

interface Predefinitions {
  [key: string]: {
    content?: string;
    beforeContent?: string;
    afterContent?: string;
    canHandleHref?: boolean;
  };
}

const predefinitions: Predefinitions = {
  a: {
    canHandleHref: true,
  },
  address: {
    afterContent: '\n',
  },
  article: {
    afterContent: '\n',
  },
  aside: {
    afterContent: '\n',
  },
  blockquote: {
    afterContent: '\n',
  },
  body: {
    afterContent: '\n',
  },
  br: {
    content: '\n',
  },
  dd: {
    afterContent: '\n',
  },
  details: {
    afterContent: '\n',
  },
  div: {
    afterContent: '\n',
  },
  dl: {
    afterContent: '\n',
  },
  dt: {
    afterContent: '\n',
  },
  fieldset: {
    afterContent: '\n',
  },
  figcaption: {
    afterContent: '\n',
  },
  figure: {
    afterContent: '\n',
  },
  footer: {
    afterContent: '\n',
  },
  form: {
    afterContent: '\n',
  },
  h1: {
    afterContent: '\n',
  },
  h2: {
    afterContent: '\n',
  },
  h3: {
    afterContent: '\n',
  },
  h4: {
    afterContent: '\n',
  },
  h5: {
    afterContent: '\n',
  },
  h6: {
    afterContent: '\n',
  },
  header: {
    afterContent: '\n',
  },
  hr: {
    content: '\n\n',
  },
  img: {
    beforeContent: '\n',
    afterContent: '\n',
  },
  legend: {
    afterContent: '\n',
  },
  li: {
    afterContent: '\n',
  },
  menu: {
    afterContent: '\n',
  },
  nav: {
    afterContent: '\n',
  },
  ol: {
    afterContent: '\n',
  },
  p: {
    afterContent: '\n',
  },
  pre: {
    afterContent: '\n',
  },
  section: {
    afterContent: '\n',
  },
  summary: {
    afterContent: '\n',
  },
  table: {
    beforeContent: '\n',
    afterContent: '\n',
  },
  tr: {
    afterContent: '\n',
  },
  ul: {
    afterContent: '\n',
  },
};

const isValidStyle = (style?: any) => Object.keys(style || {}).length > 0;

const mapStyles = (baseFontSize: number, styles: any[]): any => {
  const normalize = (style: any) => {
    const result: any = {};
    if (style) {
      for (const key of Object.keys(style)) {
        let value = style[key];
        if (/^(\-|\+)?([0-9]+(\.[0-9]+)?)em$/.test(String(value))) {
          // Handle "em" values
          const size = parseFloat(value);
          value = size * baseFontSize;
        }

        if (/^(\-|\+)?([0-9]+(\.[0-9]+)?)pt$/.test(String(value))) {
          // Handle "pt" values
          const size = parseFloat(value);
          value = size;
        }

        result[key] = value;

        // Fix lineHeight problem with text
        if (
          key === 'fontSize' &&
          value > 23 &&
          !Object.keys(style).includes('lineHeight')
        ) {
          result.lineHeight = value + 4;
        }
      }
    }
    return result;
  };

  const style = styles.reduce(
    (result, style) => Object.assign(result, normalize(style)),
    {}
  );

  return {
    fontSize: style?.fontSize || baseFontSize,
    style,
  };
};

type HtmlTextProps = {
  children: string;
  style?: TextStyle;
} & TextProps;

type HtmlTextFormattedProps = {
  forwardedProps: React.PropsWithChildren<HtmlTextProps>;
  forwardedRef?: React.Ref<Text>;
} & TextProps;

class HtmlTextFormatter extends React.PureComponent<HtmlTextFormattedProps> {
  private renderChildren(node: any, index: number, baseFontSize: number = 16) {
    const { styles, allowLinks } = this.context;

    return node.childNodes.map((childNode: any, nodeIndex: number) => {
      if (childNode.nodeType === NodeType.ELEMENT_NODE) {
        const tagName = childNode.tagName?.toLowerCase();

        const predefinition = predefinitions[tagName];
        if (predefinition?.content) {
          return predefinition?.content;
        }

        const customProps: TextProps = {};
        if (allowLinks === true && predefinition?.canHandleHref === true) {
          const href = childNode.getAttribute('href');
          Linking.canOpenURL(href).then(() => {
            customProps.onPress = () => Linking.openURL(href);
          });
        }

        const { style, fontSize } = mapStyles(baseFontSize, [
          styles[tagName],
          toRN(childNode.getAttribute('style')),
        ]);
        const content = this.renderChildren(childNode, index + 1, fontSize);

        let prefix = '';
        switch (childNode.parentNode?._tag_name) {
          case 'ul':
            // Bullet List
            prefix = '• ';
            break;
          case 'ol':
            // Numbered List
            const indexNumber = childNode.parentNode?.childNodes
              ?.filter((k: { _tag_name: string }) => k._tag_name === 'li')
              ?.findIndex((k: any) => k === childNode);

            prefix = isNaN(indexNumber) ? '- ' : `${indexNumber + 1}. `;
            break;
        }

        return [
          predefinition?.beforeContent,
          isValidStyle(style) ? (
            <Text {...customProps} key={index * nodeIndex} style={style}>
              {prefix}
              {content}
            </Text>
          ) : (
            <>
              {prefix}
              {content}
            </>
          ),
          predefinition?.afterContent,
        ];
      }

      if (childNode.nodeType === NodeType.TEXT_NODE) {
        return decode(childNode.rawText);
      }

      return null;
    });
  }

  render() {
    const { forwardedRef, forwardedProps } = this.props;

    const content = String(forwardedProps.children);
    const root = parse(content, { pre: true });

    return (
      <Text {...forwardedProps} style={forwardedProps.style} ref={forwardedRef}>
        {this.renderChildren(root, 1)}
      </Text>
    );
  }
}

HtmlTextFormatter.contextType = HtmlTextContext;

const HtmlText = (props: HtmlTextProps, ref?: React.Ref<Text>) => (
  <HtmlTextFormatter forwardedProps={props} forwardedRef={ref} />
);

const HtmlTextToExport = React.forwardRef(HtmlText);

HtmlTextToExport.displayName = 'HtmlText';

export default HtmlTextToExport;
