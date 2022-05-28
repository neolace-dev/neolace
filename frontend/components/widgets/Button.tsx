import React from 'react';
import { Icon, IconId } from './Icon';
import { Tooltip } from './Tooltip';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: IconId;
    bold?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * Our button component is a regular old button. You can click on it to do actions.
 *
 * In general, any widget which goes to a new page should be a <Link>/<a>, while any widget that performs an action on
 * the current page should be a Button. This refers to the actual HTML, not necessarily the visual appearance (you can
 * style a button to look like a link, for example, if you want).
 */
export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button({onClick, ...props}, ref) {
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (onClick) {
            onClick(event);
        }
    }, [onClick]);

    return <button ref={ref} onClick={handleClick} {...props} className={`border border-gray-500 rounded-md px-2 py-1 hover:shadow-sm hover:shadow-theme-link-color active:shadow-none m-[3px] active:ml-[4px] active:mt-[4px] active:mr-[2px] active:mb-[2px] disabled:text-gray-300 disabled:border-gray-200 disabled:hover:shadow-none disabled:cursor-not-allowed align-top ${props.bold && "font-semibold"}`}>
        {props.icon && <Icon icon={props.icon}/>}
        {props.icon && " "}
        {props.children}
    </button>
});

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconId;
    title: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    enabled?: boolean;
    children?: never;
}

/** A vertical line that can be placed between toolbar buttons, to separate them into groups. */
export const ToolbarSeparator: React.FunctionComponent<Record<never, never>> = (props) => {
    return <span aria-hidden={true} className="inline-block py-1 text-slate-200 select-none">|</span>
}

export const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({title, icon, enabled, onClick, ...props}) => {

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (onClick) {
            onClick(event);
        }
    }, [onClick]);

    return <Tooltip tooltipContent={<span>{title}</span>}>
        {attribs => <button {...props} {...attribs} aria-label={title} onClick={handleClick} className={`rounded-md px-2 py-1 hover:shadow-sm hover:shadow-gray-500 disabled:text-gray-300 disabled:hover:shadow-none disabled:cursor-not-allowed align-top ${enabled ? 'text-black' : 'text-gray-600'}`}>
            <span className={`${enabled ? "border-b-2 border-b-red-700" : ""}`}>
                <Icon icon={icon}/>
            </span>
        </button>
        }
    </Tooltip>
}
